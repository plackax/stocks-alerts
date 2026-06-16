import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Socket } from 'socket.io';
import { PRICE_PROVIDER } from './price-provider';
import { StocksGateway } from './stocks.gateway';

const SOCKET_EVENTS = {
  STOCKS_SNAPSHOT: 'stocks',
  PRICE_UPDATE: 'price_update',
  AUTH_ERROR: 'auth_error',
} as const;

describe('StocksGateway.handleConnection', () => {
  const priceProvider = {
    onFlush: jest.fn().mockReturnValue(() => undefined),
    getPrices: jest.fn().mockReturnValue([{ symbol: 'AAPL', name: 'Apple Inc.', price: 100, change: 0 }]),
    simulateTick: jest.fn(),
  };

  async function buildGateway() {
    const jwt = new JwtService({ secret: 'test-secret', signOptions: { expiresIn: '1h' } });
    const moduleRef = await Test.createTestingModule({
      providers: [
        StocksGateway,
        { provide: PRICE_PROVIDER, useValue: priceProvider },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();
    return { gateway: moduleRef.get(StocksGateway), jwt };
  }

  function createSocket(token?: string): Socket {
    return {
      id: 'socket-1',
      handshake: { auth: token ? { token } : {} },
      data: {},
      emit: jest.fn(),
      join: jest.fn(),
      disconnect: jest.fn(),
    } as unknown as Socket;
  }

  beforeEach(() => jest.clearAllMocks());

  it('binds the verified user id and joins the per-user room on a valid token', async () => {
    const { gateway, jwt } = await buildGateway();
    const token = jwt.sign({ sub: 'user-42', email: 'a@b.com' });
    const client = createSocket(token);

    gateway.handleConnection(client);

    expect(client.data.userId).toBe('user-42');
    expect(client.join).toHaveBeenCalledWith('user:user-42');
    expect(client.emit).toHaveBeenCalledWith(SOCKET_EVENTS.STOCKS_SNAPSHOT, priceProvider.getPrices());
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('rejects a connection with no token', async () => {
    const { gateway } = await buildGateway();
    const client = createSocket();

    gateway.handleConnection(client);

    expect(client.emit).toHaveBeenCalledWith(SOCKET_EVENTS.AUTH_ERROR, 'missing_token');
    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.join).not.toHaveBeenCalled();
  });

  it('rejects a connection with an invalid token', async () => {
    const { gateway } = await buildGateway();
    const client = createSocket('not-a-real-token');

    gateway.handleConnection(client);

    expect(client.emit).toHaveBeenCalledWith(SOCKET_EVENTS.AUTH_ERROR, 'invalid_token');
    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.join).not.toHaveBeenCalled();
  });
});
