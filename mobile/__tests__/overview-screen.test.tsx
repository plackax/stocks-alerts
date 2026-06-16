import { fireEvent, render, screen } from '@testing-library/react-native';
import { useStocksStore } from '../store/stocks.store';
import OverviewScreen from '../app/(app)/overview';

describe('OverviewScreen with real MultiStockChart', () => {
  it('renders the chart with visible lines and legend prices, and toggles a symbol off', async () => {
    useStocksStore.setState({
      stocksById: {
        AAPL: { symbol: 'AAPL', name: 'Apple', price: 190, change: 1 },
        GOOGL: { symbol: 'GOOGL', name: 'Alphabet', price: 140, change: -1 },
      },
      symbols: ['AAPL', 'GOOGL'],
      priceHistory: { AAPL: [188, 189, 190], GOOGL: [141, 140] },
      connected: true,
      reconnecting: false,
    });

    await render(<OverviewScreen />);

    expect(screen.getByText('Market overview')).toBeOnTheScreen();
    expect(screen.getAllByText('$190.00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$140.00').length).toBeGreaterThan(0);
    expect(screen.getByText('$163.10')).toBeOnTheScreen();

    await fireEvent.press(screen.getAllByText('AAPL')[0]);
    expect(screen.queryByText('$190.00')).toBeNull();
    expect(screen.getAllByText('$140.00').length).toBeGreaterThan(0);
    expect(screen.getByText('$141.00')).toBeOnTheScreen();
  });

  it('shows the waiting placeholder when no symbol has enough points', async () => {
    useStocksStore.setState({
      stocksById: {},
      symbols: [],
      priceHistory: { AAPL: [190] },
      connected: false,
      reconnecting: false,
    });

    await render(<OverviewScreen />);

    expect(screen.getByText('Waiting for price data…')).toBeOnTheScreen();
  });
});
