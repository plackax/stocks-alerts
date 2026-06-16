import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import messaging from '@react-native-firebase/messaging';
import { extractAlertSymbol } from '../services/notifications';
import { useAuthStore } from '../store/auth.store';

/**
 * Wires price-alert push taps to the matching stock's chart for every entry
 * point: a tap that launches the app from quit
 * ({@link messaging().getInitialNotification}), a tap that resumes it from the
 * background ({@link messaging().onNotificationOpenedApp}), and a tap on the
 * Android foreground notification re-presented locally
 * ({@link Notifications.addNotificationResponseReceivedListener}).
 *
 * Navigation is deferred until the auth state has hydrated and a session token
 * is present, so a tap is never lost when the app is still booting and never
 * pushes the chart over the login screen. The launch tap, which can resolve
 * before the gate opens, is held and flushed once the app is ready. All
 * subscriptions are removed on unmount.
 */
export function useNotificationNavigation() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const hydrated = useAuthStore((state) => state.hydrated);

  const ready = hydrated && token !== null;
  const pendingSymbolRef = useRef<string | null>(null);

  const navigateToSymbolRef = useRef<(symbol: string) => void>(() => {});
  navigateToSymbolRef.current = (symbol: string) => {
    if (ready) {
      router.push({ pathname: '/(app)/chart', params: { symbol } });
    } else {
      pendingSymbolRef.current = symbol;
    }
  };

  useEffect(() => {
    if (ready && pendingSymbolRef.current) {
      const symbol = pendingSymbolRef.current;
      pendingSymbolRef.current = null;
      router.push({ pathname: '/(app)/chart', params: { symbol } });
    }
  }, [ready, router]);

  useEffect(() => {
    let active = true;

    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (!active || !remoteMessage) {
          return;
        }
        const symbol = extractAlertSymbol(remoteMessage.data);
        if (symbol) {
          navigateToSymbolRef.current(symbol);
        }
      })
      .catch((error) => {
        console.warn('Failed to read launch notification', error);
      });

    const openedUnsubscribe = messaging().onNotificationOpenedApp((remoteMessage) => {
      const symbol = extractAlertSymbol(remoteMessage.data);
      if (symbol) {
        navigateToSymbolRef.current(symbol);
      }
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const symbol = extractAlertSymbol(response.notification.request.content.data);
      if (symbol) {
        navigateToSymbolRef.current(symbol);
      }
    });

    return () => {
      active = false;
      openedUnsubscribe();
      responseSubscription.remove();
    };
  }, []);
}
