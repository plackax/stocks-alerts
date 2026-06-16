import { create } from 'zustand';
import { api } from '../services/api';
import { PriceAlert } from '../types';

interface AlertsState {
  alerts: PriceAlert[];
  setAlerts: (alerts: PriceAlert[]) => void;
  addAlert: (alert: PriceAlert) => void;
  removeAlert: (id: string) => void;
  fetchAlerts: () => Promise<void>;
  createAlert: (symbol: string, targetPrice: number) => Promise<PriceAlert>;
}

/**
 * Price-alerts store holding the user's alerts and the actions to mutate them.
 *
 * `setAlerts`, `addAlert`, and `removeAlert` are local cache operations;
 * `fetchAlerts` reloads the full list from the backend; `createAlert`
 * additionally POSTs to the backend and inserts the persisted alert (with its
 * server-assigned id) on success.
 *
 * The store keeps every alert regardless of `triggered`; consumers use
 * {@link selectPendingAlerts} to read only the alerts that have not fired yet.
 *
 * State: `alerts`. Actions: `setAlerts`, `addAlert`, `removeAlert`,
 * `fetchAlerts`, `createAlert`.
 */
export const useAlertsStore = create<AlertsState>((set) => ({
  alerts: [],
  setAlerts: (alerts) => set({ alerts }),
  addAlert: (alert) => set((state) => ({ alerts: [...state.alerts, alert] })),
  removeAlert: (id) =>
    set((state) => ({ alerts: state.alerts.filter((alert) => alert.id !== id) })),
  /**
   * Reloads the user's alerts from the backend, replacing the local cache.
   *
   * Errors propagate to the caller so screens can surface their own loading and
   * error state.
   */
  fetchAlerts: async () => {
    const { data } = await api.get<PriceAlert[]>('/alerts');
    set({ alerts: data });
  },
  /**
   * Creates an alert on the backend and appends the persisted record to the store.
   *
   * @param symbol - The ticker symbol to watch (e.g. `AAPL`).
   * @param targetPrice - The price at which the alert should fire.
   * @returns The created {@link PriceAlert} including its server-assigned id.
   */
  createAlert: async (symbol, targetPrice) => {
    const { data } = await api.post<PriceAlert>('/alerts', { symbol, targetPrice });
    set((state) => ({ alerts: [...state.alerts, data] }));
    return data;
  },
}));

/**
 * Returns only the alerts that have not fired yet (`triggered === false`),
 * keeping already-triggered alerts out of the list UI while the store retains
 * the full set. Apply over the store's `alerts` (e.g. via `useMemo`) so the
 * derived list keeps a stable reference between unrelated renders.
 *
 * @param alerts - The full set of alerts held in the store.
 */
export const selectPendingAlerts = (alerts: PriceAlert[]) =>
  alerts.filter((alert) => !alert.triggered);
