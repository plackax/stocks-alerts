import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Slot, useRouter, useSegments, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import { TOKEN_KEY } from '../services/api';
import {
  initNotifications,
  registerForegroundMessageHandler,
  registerTokenRefreshHandler,
  syncPushTokenInBackground,
} from '../services/notifications';
import { colors } from '../constants/theme';
import { useNotificationNavigation } from '../hooks/useNotificationNavigation';
import { useAlertsStore } from '../store/alerts.store';
import { useAuthStore } from '../store/auth.store';

initNotifications();

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{error.message}</Text>
      <TouchableOpacity style={styles.errorButton} onPress={retry} accessibilityRole="button">
        <Text style={styles.errorButtonLabel}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const token = useAuthStore((state) => state.token);
  const hydrated = useAuthStore((state) => state.hydrated);

  useNotificationNavigation();

  useEffect(() => {
    SecureStore.getItemAsync(TOKEN_KEY).then((stored) => {
      useAuthStore.setState({ token: stored ?? null, hydrated: true });
      if (stored) {
        syncPushTokenInBackground();
      }
    });
  }, []);

  useEffect(() => {
    const unsubscribe = registerForegroundMessageHandler(() =>
      useAlertsStore.getState().fetchAlerts(),
    );
    return unsubscribe;
  }, []);

  useEffect(() => registerTokenRefreshHandler(), []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    const inAuthGroup = segments[0] === '(auth)';
    if (!token && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (token && inAuthGroup) {
      router.replace('/(app)');
    }
  }, [hydrated, token, segments, router]);

  if (!hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Slot />
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 24,
  },
  errorTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorMessage: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  errorButtonLabel: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
});
