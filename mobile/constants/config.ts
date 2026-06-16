/**
 * Backend base URL for all REST and Socket.IO traffic. Read from the
 * `EXPO_PUBLIC_API_URL` build-time env var, falling back to localhost for
 * local development.
 */
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

/**
 * Fully-qualified URL of the Socket.IO `/stocks` namespace used for the live
 * price feed.
 */
export const STOCKS_NAMESPACE = `${BASE_URL}/stocks`;
