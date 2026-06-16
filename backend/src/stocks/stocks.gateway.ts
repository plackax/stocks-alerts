import { Inject, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { getCorsOrigins } from '../config/cors';
import { JwtPayload } from '../auth/jwt.strategy';
import { PRICE_PROVIDER, PriceProvider } from './price-provider';

const SOCKET_EVENTS = {
  STOCKS_SNAPSHOT: 'stocks',
  PRICE_UPDATE: 'price_update',
  AUTH_ERROR: 'auth_error',
} as const;

@WebSocketGateway({ namespace: '/stocks', cors: { origin: getCorsOrigins(), credentials: true } })
export class StocksGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(StocksGateway.name);

  @WebSocketServer()
  private server: Server;

  constructor(
    @Inject(PRICE_PROVIDER) private readonly prices: PriceProvider,
    private readonly jwt: JwtService,
  ) {}

  afterInit() {
    this.prices.onFlush((updates) => {
      for (const update of updates) {
        this.server.emit(SOCKET_EVENTS.PRICE_UPDATE, update);
      }
    });
    this.logger.log('Stocks gateway initialized on namespace /stocks');
  }

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      client.emit(SOCKET_EVENTS.AUTH_ERROR, 'missing_token');
      client.disconnect(true);
      return;
    }
    let payload: JwtPayload;
    try {
      payload = this.jwt.verify<JwtPayload>(token);
    } catch {
      client.emit(SOCKET_EVENTS.AUTH_ERROR, 'invalid_token');
      client.disconnect(true);
      return;
    }
    const userId = payload.sub;
    client.data.userId = userId;
    client.join(`user:${userId}`);
    this.logger.log(`Client connected: ${client.id} (user ${userId})`);
    client.emit(SOCKET_EVENTS.STOCKS_SNAPSHOT, this.prices.getPrices());
  }
}
