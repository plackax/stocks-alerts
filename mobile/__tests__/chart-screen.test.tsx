import { render, screen } from '@testing-library/react-native';
import { useStocksStore } from '../store/stocks.store';
import ChartScreen from '../app/(app)/chart';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ symbol: 'AAPL' }),
  Stack: { Screen: () => null },
}));

describe('ChartScreen with real PriceChart', () => {
  it('shows the waiting placeholder when there are fewer than two price points', async () => {
    useStocksStore.setState({
      stocksById: {},
      symbols: [],
      priceHistory: { AAPL: [190] },
      connected: true,
      reconnecting: false,
    });

    await render(<ChartScreen />);

    expect(screen.getByText('Waiting for price data for AAPL…')).toBeOnTheScreen();
    expect(screen.getByText('Last 1 price points')).toBeOnTheScreen();
  });

  it('renders the price header and the chart when there are enough points', async () => {
    useStocksStore.setState({
      stocksById: { AAPL: { symbol: 'AAPL', name: 'Apple', price: 192.42, change: -0.8 } },
      symbols: ['AAPL'],
      priceHistory: { AAPL: [190, 191, 192, 192.42] },
      connected: true,
      reconnecting: false,
    });

    await render(<ChartScreen />);

    expect(screen.getByText('$192.42')).toBeOnTheScreen();
    expect(screen.getByText('-0.80%')).toBeOnTheScreen();
    expect(screen.getByText('Last 4 price points')).toBeOnTheScreen();
    expect(screen.queryByText('Waiting for price data for AAPL…')).toBeNull();
  });
});
