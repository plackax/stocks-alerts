import { StockPrice, PriceUpdate } from './stock-price';

export const PRICE_PROVIDER = Symbol('PRICE_PROVIDER');

export interface PriceProvider {
  onFlush(listener: (updates: PriceUpdate[]) => void): () => void;
  getPrices(): StockPrice[];
  simulateTick(symbol: string, price: number): void;
}
