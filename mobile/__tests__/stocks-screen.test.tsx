import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useStocksStore } from '../store/stocks.store';
import { useAuthStore } from '../store/auth.store';
import StocksScreen from '../app/(app)/index';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const seedEmpty = (connected: boolean, reconnecting = false) =>
  useStocksStore.setState({
    stocksById: {},
    symbols: [],
    priceHistory: {},
    connected,
    reconnecting,
  });

describe('StocksScreen with real StockCard', () => {
  beforeEach(() => {
    mockPush.mockClear();
    useAuthStore.setState({ token: 'tok', hydrated: true });
  });

  it('renders each stock (symbol, formatted price, signed change) live and navigates to the chart on press', async () => {
    useStocksStore.setState({
      stocksById: {
        AAPL: { symbol: 'AAPL', name: 'Apple', price: 190.5, change: 1.234 },
        TSLA: { symbol: 'TSLA', name: 'Tesla', price: 700, change: -2.5 },
      },
      symbols: ['AAPL', 'TSLA'],
      priceHistory: {},
      connected: true,
      reconnecting: false,
    });

    await render(<StocksScreen />);

    expect(screen.getByText('Live')).toBeOnTheScreen();
    expect(screen.getByText('Apple')).toBeOnTheScreen();
    expect(screen.getByText('$190.50')).toBeOnTheScreen();
    expect(screen.getByText('+1.23%')).toBeOnTheScreen();
    expect(screen.getByText('$700.00')).toBeOnTheScreen();
    expect(screen.getByText('-2.50%')).toBeOnTheScreen();

    await fireEvent.press(screen.getByText('AAPL'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/(app)/chart', params: { symbol: 'AAPL' } });
  });

  it('shows the connecting empty state when disconnected and the waiting state when connected', async () => {
    seedEmpty(false);
    const { rerender } = await render(<StocksScreen />);
    expect(screen.getByText('Connecting to live prices…')).toBeOnTheScreen();
    expect(screen.getByText('Disconnected')).toBeOnTheScreen();

    await act(async () => seedEmpty(true));
    await rerender(<StocksScreen />);
    expect(screen.getByText('Waiting for stock prices…')).toBeOnTheScreen();
    expect(screen.getByText('Live')).toBeOnTheScreen();
  });
});
