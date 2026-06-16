import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { api } from '../services/api';
import { useAlertsStore } from '../store/alerts.store';
import { useStocksStore } from '../store/stocks.store';
import { PriceAlert } from '../types';
import AlertsScreen from '../app/(app)/alerts';

jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return { useFocusEffect: (cb: () => void) => useEffect(cb, [cb]) };
});

const mockedApi = api as jest.Mocked<typeof api>;

describe('AlertsScreen with real AlertCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAlertsStore.setState({ alerts: [] });
    useStocksStore.setState({ stocksById: {}, symbols: [], priceHistory: {} });
  });

  it('loads alerts on focus and shows the empty state when none exist', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [] });
    await render(<AlertsScreen />);
    await waitFor(() => expect(mockedApi.get).toHaveBeenCalledWith('/alerts'));
    expect(await screen.findByText('No alerts yet.')).toBeOnTheScreen();
  });

  it('hides triggered alerts and lists only the pending ones on focus', async () => {
    const fetched: PriceAlert[] = [
      { id: 'pending', symbol: 'AAPL', targetPrice: 150, triggered: false },
      { id: 'fired', symbol: 'TSLA', targetPrice: 250, triggered: true },
    ];
    mockedApi.get.mockResolvedValueOnce({ data: fetched });

    await render(<AlertsScreen />);

    await waitFor(() => expect(mockedApi.get).toHaveBeenCalledWith('/alerts'));
    expect(await screen.findByText('Target $150.00')).toBeOnTheScreen();
    expect(screen.queryByText('Target $250.00')).toBeNull();
  });

  it('creates an alert via the form and deletes it through the real AlertCard row', async () => {
    useStocksStore.setState({ symbols: ['AAPL', 'TSLA'] });
    mockedApi.get.mockResolvedValueOnce({ data: [] });
    const created: PriceAlert = { id: 'a1', symbol: 'AAPL', targetPrice: 200, triggered: false };
    mockedApi.post.mockResolvedValueOnce({ data: created });
    mockedApi.delete.mockResolvedValueOnce({ data: {} });

    await render(<AlertsScreen />);
    await screen.findByText('No alerts yet.');

    await fireEvent.press(screen.getByText('AAPL'));
    await fireEvent.changeText(screen.getByPlaceholderText('0.00'), '200');
    await fireEvent.press(screen.getByText('Set Alert'));

    await waitFor(() =>
      expect(mockedApi.post).toHaveBeenCalledWith('/alerts', { symbol: 'AAPL', targetPrice: 200 }),
    );
    expect(await screen.findByText('Target $200.00')).toBeOnTheScreen();

    await fireEvent.press(screen.getByLabelText('Delete alert for AAPL'));
    await waitFor(() => expect(mockedApi.delete).toHaveBeenCalledWith('/alerts/a1'));
    await waitFor(() => expect(screen.queryByText('Target $200.00')).toBeNull());
  });
});
