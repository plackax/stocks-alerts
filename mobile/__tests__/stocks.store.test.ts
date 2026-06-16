import { useStocksStore } from '../store/stocks.store';
import { Stock } from '../types';

const reset = () =>
  useStocksStore.setState({
    stocksById: {},
    symbols: [],
    priceHistory: {},
    connected: false,
    reconnecting: false,
  });

describe('stocks store', () => {
  beforeEach(reset);

  it('setStocks builds stocksById + symbols and seeds history (two points when priced, empty when zero, keeps existing)', () => {
    useStocksStore.setState({ priceHistory: { AAPL: [10, 11, 12] } });
    const stocks: Stock[] = [
      { symbol: 'AAPL', name: 'Apple', price: 190, change: 1.2 },
      { symbol: 'GOOGL', name: 'Alphabet', price: 140, change: -0.5 },
      { symbol: 'NEW', name: 'Unpriced', price: 0, change: 0 },
    ];
    useStocksStore.getState().setStocks(stocks);
    const state = useStocksStore.getState();
    expect(state.symbols).toEqual(['AAPL', 'GOOGL', 'NEW']);
    expect(state.stocksById.GOOGL).toEqual(stocks[1]);
    expect(state.priceHistory.AAPL).toEqual([10, 11, 12]);
    expect(state.priceHistory.GOOGL).toEqual([140, 140]);
    expect(state.priceHistory.NEW).toEqual([]);
  });

  it('updatePrice appends capped at 20, updates only the target symbol, adds unknown symbols, and preserves others by reference', () => {
    useStocksStore.getState().setStocks([
      { symbol: 'AAPL', name: 'Apple', price: 100, change: 0 },
      { symbol: 'GOOGL', name: 'Alphabet', price: 50, change: 0 },
    ]);
    const googlBefore = useStocksStore.getState().stocksById.GOOGL;

    for (let i = 1; i <= 25; i += 1) {
      useStocksStore.getState().updatePrice('AAPL', 100 + i, i);
    }
    useStocksStore.getState().updatePrice('TSLA', 700, 3);

    const state = useStocksStore.getState();
    expect(state.priceHistory.AAPL).toHaveLength(20);
    expect(state.priceHistory.AAPL[0]).toBe(106);
    expect(state.priceHistory.AAPL.at(-1)).toBe(125);
    expect(state.stocksById.AAPL).toMatchObject({ price: 125, change: 25 });
    expect(state.stocksById.GOOGL).toBe(googlBefore);
    expect(state.symbols).toEqual(['AAPL', 'GOOGL', 'TSLA']);
    expect(state.stocksById.TSLA).toEqual({ symbol: 'TSLA', name: 'TSLA', price: 700, change: 3 });
  });
});
