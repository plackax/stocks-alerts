import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getMessaging } from 'firebase-admin/messaging';
import { DeviceTokenEntity } from '../auth/entities/device-token.entity';
import { FIREBASE_ADMIN, NotificationsService } from '../notifications/notifications.service';
import { PRICE_PROVIDER } from '../stocks/price-provider';
import { AlertsService } from './alerts.service';
import { AlertEntity } from './entities/alert.entity';

jest.mock('firebase-admin/messaging');

function createAlertRepository(triggeredRows: { id: string; user_id: string }[]) {
  const builder = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ raw: triggeredRows }),
    getRawMany: jest.fn().mockResolvedValue([]),
  };
  return { builder, createQueryBuilder: jest.fn(() => builder) };
}

describe('AlertsService.checkAlerts', () => {
  const sendEachForMulticast = jest.fn();
  const priceProvider = {
    onFlush: jest.fn().mockReturnValue(() => undefined),
    getPrices: jest.fn(),
    simulateTick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sendEachForMulticast.mockResolvedValue({ successCount: 1, failureCount: 0, responses: [{ success: true }] });
    (getMessaging as jest.Mock).mockReturnValue({ sendEachForMulticast });
  });

  async function buildService(
    triggeredRows: { id: string; user_id: string }[],
    tokens: { userId: string; token: string }[],
  ) {
    const alertRepository = createAlertRepository(triggeredRows);
    const deviceTokenRepository = {
      find: jest.fn().mockResolvedValue(tokens),
      delete: jest.fn().mockResolvedValue({ affected: tokens.length }),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        AlertsService,
        NotificationsService,
        { provide: getRepositoryToken(AlertEntity), useValue: alertRepository },
        { provide: getRepositoryToken(DeviceTokenEntity), useValue: deviceTokenRepository },
        { provide: PRICE_PROVIDER, useValue: priceProvider },
        { provide: FIREBASE_ADMIN, useValue: { name: 'test-app' } },
      ],
    }).compile();
    return { service: moduleRef.get(AlertsService), alertRepository, deviceTokenRepository };
  }

  it('sends an FCM multicast to every device token of a triggered alert owner', async () => {
    sendEachForMulticast.mockResolvedValue({
      successCount: 2,
      failureCount: 0,
      responses: [{ success: true }, { success: true }],
    });
    const { service, alertRepository } = await buildService(
      [{ id: 'alert-1', user_id: 'user-1' }],
      [
        { userId: 'user-1', token: 'token-abc' },
        { userId: 'user-1', token: 'token-def' },
      ],
    );

    await service.checkAlerts('AAPL', 150);

    expect(alertRepository.builder.returning).toHaveBeenCalledWith(['id', 'userId']);
    expect(sendEachForMulticast).toHaveBeenCalledTimes(1);
    const message = sendEachForMulticast.mock.calls[0][0];
    expect(message.tokens).toEqual(['token-abc', 'token-def']);
    expect(message.data).toEqual({ symbol: 'AAPL', price: '150' });
    expect(message.notification.body).toBe('AAPL reached $150.00');
  });

  it('does no token lookup or send when no alert is triggered', async () => {
    const { service, alertRepository, deviceTokenRepository } = await buildService([], []);

    await service.checkAlerts('AAPL', 150);

    expect(alertRepository.builder.execute).toHaveBeenCalledTimes(1);
    expect(deviceTokenRepository.find).not.toHaveBeenCalled();
    expect(sendEachForMulticast).not.toHaveBeenCalled();
  });

  it('warns and sends nothing when the triggered alert owner has no device tokens', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const { service } = await buildService([{ id: 'alert-2', user_id: 'user-2' }], []);

    await service.checkAlerts('AAPL', 150);

    expect(sendEachForMulticast).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith('Alert alert-2 triggered but user has no device tokens');
    warn.mockRestore();
  });

  it('prunes device tokens FCM reports as unregistered', async () => {
    sendEachForMulticast.mockResolvedValue({
      successCount: 1,
      failureCount: 1,
      responses: [
        { success: true },
        { success: false, error: { code: 'messaging/registration-token-not-registered', message: 'gone' } },
      ],
    });
    const { service, deviceTokenRepository } = await buildService(
      [{ id: 'alert-3', user_id: 'user-3' }],
      [
        { userId: 'user-3', token: 'good-token' },
        { userId: 'user-3', token: 'stale-token' },
      ],
    );

    await service.checkAlerts('AAPL', 150);

    expect(deviceTokenRepository.delete).toHaveBeenCalledWith({ token: expect.anything() });
    const deleteArg = deviceTokenRepository.delete.mock.calls[0][0];
    expect(deleteArg.token.value).toEqual(['stale-token']);
  });
});
