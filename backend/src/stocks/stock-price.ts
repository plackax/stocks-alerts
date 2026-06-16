export interface StockPrice {
  symbol: string;
  name: string;
  price: number;
  change: number;
}

export interface PriceUpdate {
  symbol: string;
  price: number;
  change: number;
}

export const TRACKED_SYMBOLS: Record<string, string> = {
  AAPL: 'Apple Inc.',
  GOOGL: 'Alphabet Inc.',
  MSFT: 'Microsoft Corporation',
  TSLA: 'Tesla, Inc.',
  AMZN: 'Amazon.com, Inc.',
  META: 'Meta Platforms, Inc.',
  NVDA: 'NVIDIA Corporation',
  NFLX: 'Netflix, Inc.',
};
