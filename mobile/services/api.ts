import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { BASE_URL } from '../constants/config';
import { useAuthStore } from '../store/auth.store';

/**
 * SecureStore key under which the JWT access token is persisted on the device.
 */
export const TOKEN_KEY = 'auth_token';

const REQUEST_TIMEOUT_MS = 15000;

/**
 * Shared Axios instance for all REST calls to the backend.
 *
 * Configured with the resolved {@link BASE_URL}, a JSON content type, and a
 * request timeout so a stalled network never hangs a call indefinitely. A request
 * interceptor attaches the current `Authorization: Bearer <token>` header by reading
 * the auth store synchronously, so callers never pass the token explicitly. A
 * response interceptor clears the session on `401` so an expired or revoked token
 * drops the app back to the login screen.
 */
export const api = axios.create({
  baseURL: BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && useAuthStore.getState().token) {
      try {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      } catch (deleteError) {
        console.warn('Failed to clear stored token on 401', deleteError);
      }
      useAuthStore.getState().clearToken();
    }
    return Promise.reject(error);
  },
);
