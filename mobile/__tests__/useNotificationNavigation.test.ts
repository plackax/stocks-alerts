import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import messaging from '@react-native-firebase/messaging';
import { useNotificationNavigation } from '../hooks/useNotificationNavigation';
import { useAuthStore } from '../store/auth.store';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

interface RemoteMessage {
  data?: Record<string, unknown>;
}
type OpenedListener = (message: RemoteMessage) => void;
type ResponseListener = (response: {
  notification: { request: { content: { data: Record<string, unknown> } } };
}) => void;

const messagingInstance = messaging() as unknown as {
  getInitialNotification: jest.Mock<Promise<RemoteMessage | null>, []>;
  onNotificationOpenedApp: jest.Mock;
};
const addResponseListener = Notifications.addNotificationResponseReceivedListener as jest.Mock;

let openedListener: OpenedListener | undefined;
let responseListener: ResponseListener | undefined;
const openedUnsubscribe = jest.fn();
const responseRemove = jest.fn();

const authenticated = () => useAuthStore.setState({ token: 'tok', hydrated: true });
const chartFor = (symbol: string) => ({ pathname: '/(app)/chart', params: { symbol } });
const flush = () => act(async () => {});
const mount = () => renderHook(() => useNotificationNavigation());

describe('useNotificationNavigation', () => {
  beforeEach(() => {
    mockPush.mockReset();
    openedUnsubscribe.mockReset();
    responseRemove.mockReset();
    openedListener = undefined;
    responseListener = undefined;

    messagingInstance.getInitialNotification.mockReset().mockResolvedValue(null);
    messagingInstance.onNotificationOpenedApp.mockReset().mockImplementation((cb: OpenedListener) => {
      openedListener = cb;
      return openedUnsubscribe;
    });
    addResponseListener.mockReset().mockImplementation((cb: ResponseListener) => {
      responseListener = cb;
      return { remove: responseRemove };
    });

    useAuthStore.setState({ token: null, hydrated: false });
  });

  it('navigates to the stock chart when a background tap delivers a symbol', async () => {
    authenticated();
    await mount();
    await flush();

    openedListener?.({ data: { symbol: 'AAPL', price: '190' } });
    expect(mockPush).toHaveBeenCalledWith(chartFor('AAPL'));
  });

  it('navigates from a foreground notification tap via the expo response listener', async () => {
    authenticated();
    await mount();
    await flush();

    responseListener?.({
      notification: { request: { content: { data: { symbol: 'TSLA' } } } },
    });
    expect(mockPush).toHaveBeenCalledWith(chartFor('TSLA'));
  });

  it('opens the chart from a quit-state launch tap once the app is ready', async () => {
    authenticated();
    messagingInstance.getInitialNotification.mockResolvedValue({ data: { symbol: 'MSFT' } });

    await mount();

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith(chartFor('MSFT')));
  });

  it('defers a launch tap until auth has hydrated and a token exists', async () => {
    messagingInstance.getInitialNotification.mockResolvedValue({ data: { symbol: 'NVDA' } });

    await mount();
    await flush();
    expect(mockPush).not.toHaveBeenCalled();

    await act(async () => authenticated());

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith(chartFor('NVDA')));
  });

  it('ignores notifications without a symbol and removes its listeners on unmount', async () => {
    authenticated();
    messagingInstance.getInitialNotification.mockResolvedValue({ data: {} });

    const { unmount } = await mount();
    await flush();
    openedListener?.({ data: {} });
    responseListener?.({ notification: { request: { content: { data: {} } } } });
    expect(mockPush).not.toHaveBeenCalled();

    await unmount();
    expect(openedUnsubscribe).toHaveBeenCalledTimes(1);
    expect(responseRemove).toHaveBeenCalledTimes(1);
  });
});
