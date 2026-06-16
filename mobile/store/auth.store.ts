import { create } from 'zustand';

interface AuthState {
  token: string | null;
  hydrated: boolean;
  setToken: (token: string) => void;
  clearToken: () => void;
}

/**
 * Auth session store holding the JWT and a hydration flag.
 *
 * `token` is the current JWT (or `null` when signed out); `hydrated` becomes
 * `true` once the token has been read back from secure storage at startup, which
 * gates the initial navigation. Read synchronously via `getState()` outside the
 * component tree by the Axios request interceptor.
 *
 * State: `token`, `hydrated`. Actions: `setToken`, `clearToken`.
 */
export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  hydrated: false,
  setToken: (token) => set({ token }),
  clearToken: () => set({ token: null }),
}));
