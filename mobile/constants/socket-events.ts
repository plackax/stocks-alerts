// Must stay in sync with backend/src/stocks/socket-events.ts
/**
 * Socket.IO event names for the `/stocks` namespace.
 *
 * - `STOCKS_SNAPSHOT` (`stocks`) — full list of tracked stocks sent on connect.
 * - `PRICE_UPDATE` (`price_update`) — incremental per-symbol price tick.
 * - `AUTH_ERROR` (`auth_error`) — emitted when the handshake token is rejected.
 *
 * Must stay in sync with the backend's event names.
 */
export const SOCKET_EVENTS = {
  STOCKS_SNAPSHOT: 'stocks',
  PRICE_UPDATE: 'price_update',
  AUTH_ERROR: 'auth_error',
} as const;
