import { create } from 'zustand';
import { Stock } from '../types';

const MAX_HISTORY_POINTS = 20;

interface StocksState {
  stocksById: Record<string, Stock>;
  symbols: string[];
  priceHistory: Record<string, number[]>;
  connected: boolean;
  reconnecting: boolean;
  setStocks: (stocks: Stock[]) => void;
  updatePrice: (symbol: string, price: number, change: number) => void;
  setConnected: (connected: boolean) => void;
  setReconnecting: (reconnecting: boolean) => void;
}

/**
 * Live stocks store: normalized prices, per-symbol price history, and socket
 * connection status.
 *
 * Stocks are keyed by symbol in `stocksById` (with `symbols` preserving order)
 * so a single price tick re-renders only the affected card. `priceHistory`
 * keeps a rolling window of the most recent prices per symbol (capped at 20
 * points) for the charts. `setStocks` replaces the snapshot while preserving any
 * accumulated history; `updatePrice` applies one tick and appends to history.
 *
 * State: `stocksById`, `symbols`, `priceHistory`, `connected`, `reconnecting`.
 * Actions: `setStocks`, `updatePrice`, `setConnected`, `setReconnecting`.
 */
export const useStocksStore = create<StocksState>((set) => ({
  stocksById: {},
  symbols: [],
  priceHistory: {},
  connected: false,
  reconnecting: false,
  setConnected: (connected) => set({ connected }),
  setReconnecting: (reconnecting) => set({ reconnecting }),
  setStocks: (stocks) =>
    set((state) => {
      const stocksById: Record<string, Stock> = {};
      const symbols: string[] = [];
      const priceHistory = { ...state.priceHistory };
      for (const stock of stocks) {
        stocksById[stock.symbol] = stock;
        symbols.push(stock.symbol);
        if (!priceHistory[stock.symbol]) {
          priceHistory[stock.symbol] = stock.price > 0 ? [stock.price, stock.price] : [];
        }
      }
      return { stocksById, symbols, priceHistory };
    }),
  updatePrice: (symbol, price, change) =>
    set((state) => {
      if (!Number.isFinite(price)) {
        return state;
      }

      const existing = state.stocksById[symbol];
      const stocksById = {
        ...state.stocksById,
        [symbol]: existing
          ? { ...existing, price, change }
          : { symbol, name: symbol, price, change },
      };
      const symbols = existing ? state.symbols : [...state.symbols, symbol];

      const history = state.priceHistory[symbol] ?? [];
      const isDuplicate = history.length > 0 && history[history.length - 1] === price;
      const nextHistory = isDuplicate ? history : [...history, price].slice(-MAX_HISTORY_POINTS);

      return {
        stocksById,
        symbols,
        priceHistory: { ...state.priceHistory, [symbol]: nextHistory },
      };
    }),
}));

/**
 * Selector returning the ordered list of tracked symbols. Use with
 * `useStocksStore` to subscribe only to symbol-list changes, not price ticks.
 */
export const selectSymbols = (state: StocksState) => state.symbols;
