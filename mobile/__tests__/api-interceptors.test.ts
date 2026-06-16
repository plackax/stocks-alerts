jest.unmock('../services/api');

import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { api, TOKEN_KEY } from '../services/api';
import { useAuthStore } from '../store/auth.store';

const deleteItem = SecureStore.deleteItemAsync as jest.Mock;

const respondWith = (status: number) => (config: InternalAxiosRequestConfig) => {
  const response = { data: null, status, statusText: '', headers: {}, config };
  if (status >= 400) {
    const error = new Error(`Request failed with status ${status}`) as AxiosError;
    error.config = config;
    error.response = response;
    return Promise.reject(error);
  }
  return Promise.resolve(response);
};

describe('api response interceptor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ token: 'tok', hydrated: true });
  });

  it('clears the stored token and the auth store on a 401', async () => {
    await expect(api.get('/alerts', { adapter: respondWith(401) })).rejects.toBeDefined();

    expect(deleteItem).toHaveBeenCalledWith(TOKEN_KEY);
    expect(useAuthStore.getState().token).toBeNull();
  });

  it('attaches the bearer token on outgoing requests', async () => {
    let seenAuth: unknown;
    await api.get('/alerts', {
      adapter: (requestConfig) => {
        seenAuth = requestConfig.headers.Authorization;
        return respondWith(200)(requestConfig);
      },
    });

    expect(seenAuth).toBe('Bearer tok');
  });

  it('leaves the session untouched on non-401 errors', async () => {
    await expect(api.get('/alerts', { adapter: respondWith(500) })).rejects.toBeDefined();

    expect(deleteItem).not.toHaveBeenCalled();
    expect(useAuthStore.getState().token).toBe('tok');
  });
});
