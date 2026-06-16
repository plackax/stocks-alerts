import { useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api, TOKEN_KEY } from '../services/api';
import { syncPushTokenInBackground } from '../services/notifications';
import { useAuthStore } from '../store/auth.store';
import { LoginResponse } from '../types';

/**
 * Authentication hook exposing the current session token and the login,
 * register, and logout actions.
 *
 * `login` and `register` call the backend, persist the returned JWT to
 * `expo-secure-store`, push it into the auth store, and kick off FCM token
 * registration in the background. `logout` clears the stored token and resets
 * the auth store.
 *
 * @returns `token` (the current JWT or `null`) plus the `login`, `register`,
 * and `logout` action callbacks.
 */
export function useAuth() {
  const token = useAuthStore((state) => state.token);
  const setToken = useAuthStore((state) => state.setToken);
  const clearToken = useAuthStore((state) => state.clearToken);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
      await SecureStore.setItemAsync(TOKEN_KEY, data.accessToken);
      setToken(data.accessToken);

      syncPushTokenInBackground();
    },
    [setToken],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      const { data } = await api.post<LoginResponse>('/auth/register', { email, password });
      await SecureStore.setItemAsync(TOKEN_KEY, data.accessToken);
      setToken(data.accessToken);

      syncPushTokenInBackground();
    },
    [setToken],
  );

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    clearToken();
  }, [clearToken]);

  return { token, login, register, logout };
}
