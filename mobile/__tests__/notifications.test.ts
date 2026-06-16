import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import messaging from '@react-native-firebase/messaging';
import {
  extractAlertSymbol,
  registerForegroundMessageHandler,
  registerTokenRefreshHandler,
} from '../services/notifications';

const messagingInstance = messaging() as unknown as {
  onMessage: jest.Mock;
  onTokenRefresh: jest.Mock;
};
const scheduleMock = Notifications.scheduleNotificationAsync as jest.Mock;

describe('extractAlertSymbol', () => {
  it('returns the symbol when present as a non-empty string', () => {
    expect(extractAlertSymbol({ symbol: 'AAPL', price: '190' })).toBe('AAPL');
  });

  it('returns null when the symbol is missing, blank, or non-string', () => {
    expect(extractAlertSymbol(undefined)).toBeNull();
    expect(extractAlertSymbol(null)).toBeNull();
    expect(extractAlertSymbol({})).toBeNull();
    expect(extractAlertSymbol({ symbol: '' })).toBeNull();
    expect(extractAlertSymbol({ symbol: { nested: true } })).toBeNull();
  });
});

describe('registerForegroundMessageHandler', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'android';
  });

  afterEach(() => {
    Platform.OS = originalOS;
  });

  it('forwards the alert symbol into the local notification data on Android', async () => {
    let handler: ((message: { data?: Record<string, unknown> }) => Promise<void>) | undefined;
    messagingInstance.onMessage.mockImplementationOnce((cb) => {
      handler = cb;
      return jest.fn();
    });

    registerForegroundMessageHandler();
    await handler?.({ data: { symbol: 'TSLA', price: '700' } });

    expect(scheduleMock).toHaveBeenCalledTimes(1);
    expect(scheduleMock.mock.calls[0][0].content.data).toEqual({ symbol: 'TSLA' });
  });
});

describe('registerTokenRefreshHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('subscribes to token rotations and returns the unsubscribe function', () => {
    const unsubscribe = jest.fn();
    messagingInstance.onTokenRefresh.mockReturnValueOnce(unsubscribe);

    expect(registerTokenRefreshHandler()).toBe(unsubscribe);
    expect(messagingInstance.onTokenRefresh).toHaveBeenCalledTimes(1);
    expect(typeof messagingInstance.onTokenRefresh.mock.calls[0][0]).toBe('function');
  });
});
