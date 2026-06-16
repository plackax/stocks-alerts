import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { api } from './api';

/**
 * Reads the ticker symbol carried by a price-alert push so a tap can deep-link
 * to that stock. The FCM `data` payload is an untyped string/object map, so this
 * narrows it to a usable symbol and returns `null` when one is absent or blank.
 *
 * @param data - The `data` field of an FCM `RemoteMessage` or a local
 * notification's `content.data`.
 */
export function extractAlertSymbol(data: Record<string, unknown> | undefined | null) {
  const symbol = data?.symbol;
  return typeof symbol === 'string' && symbol.length > 0 ? symbol : null;
}

/**
 * Installs the global notification handler that decides how foreground
 * notifications are presented (banner, list, and sound; no badge).
 *
 * Call once at app startup, before any notification can arrive.
 */
export function initNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Subscribes to FCM messages received while the app is in the foreground.
 *
 * On Android, FCM does not auto-present foreground messages, so each one is
 * re-presented as a local notification; the alert's `symbol` is forwarded into
 * the local notification's `content.data` so tapping it can deep-link to that
 * stock. On iOS the native foreground banner is shown by Firebase (configured
 * via `firebase.json`), so no local notification is scheduled to avoid a
 * duplicate banner.
 *
 * @param onMessage - Optional side effect run for every foreground message,
 * regardless of platform; used to refresh state (e.g. reload alerts) so a
 * just-fired alert disappears in real time. Failures are logged and swallowed
 * so they never disrupt notification presentation.
 * @returns An unsubscribe function; call it on unmount to remove the listener.
 */
export function registerForegroundMessageHandler(onMessage?: () => void | Promise<void>) {
  return messaging().onMessage(async (remoteMessage) => {
    if (onMessage) {
      try {
        await onMessage();
      } catch (error) {
        console.warn('Foreground notification refresh failed', error);
      }
    }
    if (Platform.OS !== 'android') {
      return;
    }
    const symbol = extractAlertSymbol(remoteMessage.data);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: remoteMessage.notification?.title ?? 'Price Alert',
        body: remoteMessage.notification?.body ?? '',
        data: symbol ? { symbol } : {},
      },
      trigger: null,
    });
  });
}

/**
 * Requests notification permission and resolves the device's FCM token.
 *
 * On Android it ensures the default notification channel exists and returns the
 * native device push token. On iOS it registers the device for remote messages
 * via `@react-native-firebase/messaging` and returns a real FCM token (APNs is
 * bridged by Firebase on the backend's behalf).
 *
 * @returns The FCM token, or `null` if the user denies the permission prompt.
 */
export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      lightColor: '#00c853',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return null;
  }

  if (Platform.OS === 'ios') {
    await messaging().registerDeviceForRemoteMessages();
    return messaging().getToken();
  }

  const devicePushToken = await Notifications.getDevicePushTokenAsync();
  return devicePushToken.data;
}

/**
 * Persists the device's FCM token on the backend for the authenticated user so
 * price-alert pushes can be delivered to it. The backend stores tokens
 * additively (one user may have several devices), so re-syncing the same token
 * is idempotent and safe to call repeatedly.
 *
 * @param token - The FCM token from {@link registerForPushNotificationsAsync}.
 */
export async function syncFcmToken(token: string) {
  await api.patch('/auth/fcm-token', { token });
}

/**
 * Resolves the device's FCM token and syncs it to the backend, swallowing any
 * failure so push registration never blocks or breaks the calling flow.
 *
 * Safe to call on login, on register, and again on launch for an
 * already-authenticated user, since {@link syncFcmToken} is idempotent.
 */
export function syncPushTokenInBackground() {
  void (async () => {
    try {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        await syncFcmToken(token);
      }
    } catch (error) {
      console.warn('Push token registration failed', error);
    }
  })();
}

/**
 * Subscribes to FCM token rotations and re-syncs the new token to the backend so
 * pushes keep arriving after Firebase rotates the device token. Failures are
 * caught and logged so a transient sync error never crashes the listener.
 *
 * @returns An unsubscribe function; call it on unmount to remove the listener.
 */
export function registerTokenRefreshHandler() {
  return messaging().onTokenRefresh((token) => {
    syncFcmToken(token).catch((error) => {
      console.warn('FCM token refresh sync failed', error);
    });
  });
}
