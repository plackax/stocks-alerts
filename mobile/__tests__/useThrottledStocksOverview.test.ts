import { act, renderHook } from '@testing-library/react-native';
import { useThrottledStocksOverview } from '../hooks/useThrottledStocksOverview';
import { useStocksStore } from '../store/stocks.store';

const reset = () =>
  useStocksStore.setState({
    stocksById: {},
    symbols: [],
    priceHistory: {},
    connected: false,
    reconnecting: false,
  });

const tick = (price: number) =>
  act(async () => {
    useStocksStore.getState().updatePrice('AAPL', price, 0);
  });

const advanceWindow = () =>
  act(async () => {
    jest.advanceTimersByTime(1000);
  });

describe('useThrottledStocksOverview', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    reset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the current store projection on first render', async () => {
    useStocksStore.setState({
      stocksById: { AAPL: { symbol: 'AAPL', name: 'Apple', price: 190, change: 1 } },
      symbols: ['AAPL'],
      priceHistory: { AAPL: [189, 190] },
    });

    const { result } = await renderHook(() => useThrottledStocksOverview());

    expect(result.current?.stocksById.AAPL.price).toBe(190);
    expect(result.current?.priceHistory.AAPL).toEqual([189, 190]);
  });

  it('coalesces a burst of ticks and reflects the latest value once the window elapses', async () => {
    const { result } = await renderHook(() => useThrottledStocksOverview());

    await tick(100);
    const afterFirst = result.current;
    expect(afterFirst?.stocksById.AAPL.price).toBe(100);

    await tick(101);
    await tick(102);
    expect(result.current).toBe(afterFirst);
    expect(result.current?.stocksById.AAPL.price).toBe(100);

    await advanceWindow();
    expect(result.current).not.toBe(afterFirst);
    expect(result.current?.stocksById.AAPL.price).toBe(102);
    expect(result.current?.priceHistory.AAPL).toEqual([100, 101, 102]);
  });

  it('publishes once per window regardless of how many ticks arrive', async () => {
    const { result } = await renderHook(() => useThrottledStocksOverview());

    await tick(1);
    const afterFirst = result.current;

    for (let price = 2; price <= 50; price += 1) {
      await tick(price);
    }
    expect(result.current).toBe(afterFirst);

    await advanceWindow();
    expect(result.current).not.toBe(afterFirst);
    expect(result.current?.stocksById.AAPL.price).toBe(50);
  });
});
