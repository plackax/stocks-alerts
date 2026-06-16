import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import WebSocket from 'ws';
import { PriceProvider } from './price-provider';
import { PriceUpdate, TRACKED_SYMBOLS } from './stock-price';

interface CachedPrice {
  price: number;
  baseline: number;
}

interface FinnhubTrade {
  s: string;
  p: number;
}

interface FinnhubMessage {
  type?: string;
  data?: FinnhubTrade[];
}

interface FinnhubQuote {
  pc?: number;
}

const RECONNECT_DELAY_MS = 5000;
const FLUSH_INTERVAL_MS = 400;

@Injectable()
export class FinnhubService implements PriceProvider, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FinnhubService.name);
  private readonly cache = new Map<string, CachedPrice>();
  private readonly flushListeners = new Set<(updates: PriceUpdate[]) => void>();
  private readonly pendingFlush = new Map<string, PriceUpdate>();
  private readonly baselineRequests = new Set<string>();
  private socket: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private flushTimer: NodeJS.Timeout | null = null;
  private closing = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
    this.connect();
  }

  onModuleDestroy() {
    this.closing = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.socket?.close();
  }

  onFlush(listener: (updates: PriceUpdate[]) => void) {
    this.flushListeners.add(listener);
    return () => this.flushListeners.delete(listener);
  }

  getPrices() {
    return Object.entries(TRACKED_SYMBOLS).map(([symbol, name]) => {
      const cached = this.cache.get(symbol);
      const price = cached?.price ?? 0;
      const baseline = cached?.baseline ?? 0;
      const change = baseline > 0 ? ((price - baseline) / baseline) * 100 : 0;
      return { symbol, name, price, change };
    });
  }

  private connect() {
    const apiKey = this.config.getOrThrow<string>('FINNHUB_API_KEY');
    const socket = new WebSocket(`wss://ws.finnhub.io?token=${apiKey}`);
    this.socket = socket;

    socket.on('open', () => {
      this.logger.log('Connected to Finnhub WebSocket');
      for (const symbol of Object.keys(TRACKED_SYMBOLS)) {
        socket.send(JSON.stringify({ type: 'subscribe', symbol }));
      }
    });

    socket.on('message', (raw: WebSocket.RawData) => {
      this.handleMessage(raw.toString());
    });

    socket.on('error', (error) => {
      this.logger.error('Finnhub WebSocket error', error.message);
    });

    socket.on('close', () => {
      this.socket = null;
      if (this.closing) {
        return;
      }
      this.logger.warn(`Finnhub WebSocket closed, reconnecting in ${RECONNECT_DELAY_MS}ms`);
      this.reconnectTimer = setTimeout(() => this.connect(), RECONNECT_DELAY_MS);
    });
  }

  private handleMessage(payload: string) {
    let message: FinnhubMessage;
    try {
      message = JSON.parse(payload);
    } catch {
      this.logger.warn('Received non-JSON message from Finnhub');
      return;
    }
    if (message.type === 'ping') {
      this.socket?.send(JSON.stringify({ type: 'pong' }));
      return;
    }
    if (message.type !== 'trade' || !Array.isArray(message.data)) {
      return;
    }
    for (const trade of message.data) {
      if (typeof trade.s !== 'string' || typeof trade.p !== 'number') {
        continue;
      }
      this.applyTrade(trade.s, trade.p);
    }
  }

  simulateTick(symbol: string, price: number) {
    this.applyTrade(symbol, price);
  }

  private applyTrade(symbol: string, price: number) {
    if (!(symbol in TRACKED_SYMBOLS)) {
      return;
    }
    const existing = this.cache.get(symbol);
    if (!existing) {
      void this.seedBaseline(symbol);
    }
    const baseline = existing?.baseline ?? price;
    this.cache.set(symbol, { price, baseline });
    const change = baseline > 0 ? ((price - baseline) / baseline) * 100 : 0;
    this.pendingFlush.set(symbol, { symbol, price, change });
  }

  private async seedBaseline(symbol: string) {
    if (this.baselineRequests.has(symbol)) {
      return;
    }
    this.baselineRequests.add(symbol);
    const apiKey = this.config.getOrThrow<string>('FINNHUB_API_KEY');
    try {
      const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`);
      if (!response.ok) {
        this.logger.warn(`Failed to seed baseline for ${symbol}: HTTP ${response.status}`);
        return;
      }
      const quote = (await response.json()) as FinnhubQuote;
      const previousClose = quote.pc;
      if (typeof previousClose !== 'number' || previousClose <= 0) {
        return;
      }
      const cached = this.cache.get(symbol);
      const price = cached?.price ?? previousClose;
      this.cache.set(symbol, { price, baseline: previousClose });
    } catch (error) {
      this.logger.warn(
        `Failed to seed baseline for ${symbol}: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.baselineRequests.delete(symbol);
    }
  }

  private flush() {
    if (this.pendingFlush.size === 0) {
      return;
    }
    const updates = [...this.pendingFlush.values()];
    this.pendingFlush.clear();
    for (const listener of this.flushListeners) {
      listener(updates);
    }
  }
}
