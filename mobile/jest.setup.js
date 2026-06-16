require('react-native-gesture-handler/jestSetup');

jest.mock('@shopify/react-native-skia', () => {
  const { Mock } = require('@shopify/react-native-skia/lib/commonjs/mock');
  const CanvasKit = new Proxy(
    {},
    { get: () => () => ({}) },
  );
  return Mock(CanvasKit);
});

jest.mock('react-native-worklets', () =>
  require('react-native-worklets/src/mock'),
);

jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getDevicePushTokenAsync: jest.fn().mockResolvedValue({ data: 'token' }),
  scheduleNotificationAsync: jest.fn().mockResolvedValue(undefined),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  AndroidImportance: { MAX: 5 },
}));

const mockFirebaseMessaging = {
  getToken: jest.fn(() => Promise.resolve('test-fcm-token')),
  registerDeviceForRemoteMessages: jest.fn(() => Promise.resolve()),
  onMessage: jest.fn(() => jest.fn()),
  onTokenRefresh: jest.fn(() => jest.fn()),
  getInitialNotification: jest.fn(() => Promise.resolve(null)),
  onNotificationOpenedApp: jest.fn(() => jest.fn()),
};

jest.mock('@react-native-firebase/messaging', () => () => mockFirebaseMessaging);

jest.mock('socket.io-client', () => {
  const socket = {
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    removeAllListeners: jest.fn(),
    io: { on: jest.fn() },
  };
  return { io: jest.fn(() => socket), Socket: jest.fn() };
});

jest.mock('./services/api', () => ({
  TOKEN_KEY: 'auth_token',
  api: {
    get: jest.fn().mockResolvedValue({ data: [] }),
    post: jest.fn().mockResolvedValue({ data: {} }),
    patch: jest.fn().mockResolvedValue({ data: {} }),
    delete: jest.fn().mockResolvedValue({ data: {} }),
  },
}));
