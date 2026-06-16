/**
 * A tracked stock as held in the store and rendered in the UI.
 *
 * @property symbol - Ticker symbol (e.g. `AAPL`).
 * @property name - Display name; falls back to the symbol when unknown.
 * @property price - Latest trade price.
 * @property change - Percentage change versus the session baseline.
 */
export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
}

/**
 * Incremental price tick pushed over the `price_update` socket event.
 *
 * @property symbol - Ticker symbol the update applies to.
 * @property price - New trade price.
 * @property change - Percentage change versus the session baseline.
 */
export interface PriceUpdate {
  symbol: string;
  price: number;
  change: number;
}

/**
 * A user-defined price alert.
 *
 * @property id - Server-assigned identifier.
 * @property symbol - Ticker symbol being watched.
 * @property targetPrice - Price at which the alert fires.
 * @property triggered - Whether the alert has already fired; pending alerts are `false`.
 */
export interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  triggered: boolean;
}

/**
 * Response body from the login and register endpoints.
 *
 * @property accessToken - JWT used for REST auth and the socket handshake.
 */
export interface LoginResponse {
  accessToken: string;
}
