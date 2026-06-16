import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { STOCKS_NAMESPACE } from '../constants/config';
import { SOCKET_EVENTS } from '../constants/socket-events';
import { useAuthStore } from '../store/auth.store';
import { useStocksStore } from '../store/stocks.store';
import { PriceUpdate, Stock } from '../types';

/**
 * Maintains the authenticated Socket.IO connection to the `/stocks` namespace
 * and streams live price data into the stocks store.
 *
 * While `token` is non-null it opens one connection, applies the initial
 * snapshot, and merges incremental price updates. The JWT is supplied through the
 * handshake `auth` callback, which the client invokes on every (re)connect, so a
 * reconnect after a token change always sends the current token from the auth
 * store rather than the stale one captured when the socket was created.
 * Connection state is mirrored into the store as `connected` / `reconnecting`.
 * Reconnection is automatic with backoff; if it is exhausted or the server
 * rejects the token, `onAuthError` fires so the caller can force a re-login. The
 * connection is torn down on unmount or when `token` changes.
 *
 * @param token - The JWT used to authenticate the socket handshake, or `null`
 * to keep the socket closed.
 * @param onAuthError - Invoked when authentication fails or reconnection is
 * exhausted; always reads the latest reference, so it need not be memoized.
 */
export function useSocket(token: string | null, onAuthError: () => void) {
  const setStocks = useStocksStore((state) => state.setStocks);
  const updatePrice = useStocksStore((state) => state.updatePrice);
  const setConnected = useStocksStore((state) => state.setConnected);
  const setReconnecting = useStocksStore((state) => state.setReconnecting);

  const onAuthErrorRef = useRef(onAuthError);
  onAuthErrorRef.current = onAuthError;

  useEffect(() => {
    if (!token) {
      return;
    }

    const socket: Socket = io(STOCKS_NAMESPACE, {
      auth: (cb) => cb({ token: useAuthStore.getState().token ?? '' }),
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    socket.on('connect', () => {
      setConnected(true);
      setReconnecting(false);
    });
    socket.on('disconnect', () => {
      setConnected(false);
      setReconnecting(true);
    });
    socket.on('connect_error', () => {
      setConnected(false);
      setReconnecting(true);
    });
    socket.io.on('reconnect_failed', () => {
      setReconnecting(false);
      onAuthErrorRef.current();
    });
    socket.on(SOCKET_EVENTS.AUTH_ERROR, () => {
      setReconnecting(false);
      onAuthErrorRef.current();
    });

    socket.on(SOCKET_EVENTS.STOCKS_SNAPSHOT, (stocks: Stock[]) => setStocks(stocks));
    socket.on(SOCKET_EVENTS.PRICE_UPDATE, ({ symbol, price, change }: PriceUpdate) =>
      updatePrice(symbol, price, change),
    );

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      setConnected(false);
      setReconnecting(false);
    };
  }, [token, setStocks, updatePrice, setConnected, setReconnecting]);
}
