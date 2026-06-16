import { Inject, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { DeviceTokenEntity } from '../auth/entities/device-token.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { PRICE_PROVIDER, PriceProvider } from '../stocks/price-provider';
import { PriceUpdate } from '../stocks/stock-price';
import { AlertEntity } from './entities/alert.entity';

const ACTIVE_SYMBOLS_REFRESH_MS = 60_000;

@Injectable()
export class AlertsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AlertsService.name);
  private readonly activeSymbols = new Set<string>();
  private refreshTimer: NodeJS.Timeout | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(
    @InjectRepository(AlertEntity)
    private readonly alerts: Repository<AlertEntity>,
    @InjectRepository(DeviceTokenEntity)
    private readonly deviceTokens: Repository<DeviceTokenEntity>,
    private readonly notifications: NotificationsService,
    @Inject(PRICE_PROVIDER) private readonly prices: PriceProvider,
  ) {}

  async onModuleInit() {
    await this.refreshActiveSymbols();
    this.refreshTimer = setInterval(() => {
      void this.refreshActiveSymbols();
    }, ACTIVE_SYMBOLS_REFRESH_MS);
    this.unsubscribe = this.prices.onFlush((updates) => {
      this.onPrices(updates);
    });
  }

  onModuleDestroy() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.unsubscribe?.();
  }

  async create(userId: string, symbol: string, targetPrice: number) {
    const alert = await this.alerts.save(
      this.alerts.create({ userId, symbol, targetPrice, triggered: false }),
    );
    this.activeSymbols.add(symbol);
    return alert;
  }

  findByUser(userId: string) {
    return this.alerts.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async remove(userId: string, id: string) {
    const alert = await this.alerts.findOne({ where: { id, userId } });
    if (!alert) {
      throw new NotFoundException('Alert not found');
    }
    await this.alerts.remove(alert);
    await this.refreshActiveSymbols();
    return { success: true };
  }

  private onPrices(updates: PriceUpdate[]) {
    for (const update of updates) {
      if (!this.activeSymbols.has(update.symbol)) {
        continue;
      }
      void this.checkAlerts(update.symbol, update.price).catch((error) => {
        this.logger.error(
          `Failed to check alerts for ${update.symbol}`,
          error instanceof Error ? error.stack : String(error),
        );
      });
    }
  }

  private async refreshActiveSymbols() {
    const rows = await this.alerts
      .createQueryBuilder('alert')
      .select('DISTINCT alert.symbol', 'symbol')
      .where('alert.triggered = false')
      .getRawMany<{ symbol: string }>();
    this.activeSymbols.clear();
    for (const row of rows) {
      this.activeSymbols.add(row.symbol);
    }
  }

  async checkAlerts(symbol: string, price: number) {
    const result = await this.alerts
      .createQueryBuilder()
      .update(AlertEntity)
      .set({ triggered: true })
      .where('symbol = :symbol', { symbol })
      .andWhere('triggered = false')
      .andWhere('target_price <= :price', { price })
      .returning(['id', 'userId'])
      .execute();

    const triggered = result.raw as { id: string; user_id: string }[];
    if (triggered.length === 0) {
      return;
    }

    const userIds = [...new Set(triggered.map((row) => row.user_id))];
    const tokens = await this.deviceTokens.find({
      where: { userId: In(userIds) },
      select: { userId: true, token: true },
    });
    const tokensByUser = new Map<string, string[]>();
    for (const { userId, token } of tokens) {
      const existing = tokensByUser.get(userId);
      if (existing) {
        existing.push(token);
      } else {
        tokensByUser.set(userId, [token]);
      }
    }

    const targets: { token: string; symbol: string; price: number }[] = [];
    for (const row of triggered) {
      const userTokens = tokensByUser.get(row.user_id);
      if (!userTokens || userTokens.length === 0) {
        this.logger.warn(`Alert ${row.id} triggered but user has no device tokens`);
        continue;
      }
      for (const token of userTokens) {
        targets.push({ token, symbol, price });
      }
    }

    const invalidTokens = await this.notifications.sendPriceAlerts(targets);
    if (invalidTokens.length > 0) {
      await this.pruneTokens(invalidTokens);
    }

    await this.refreshActiveSymbols();
  }

  private async pruneTokens(tokens: string[]) {
    await this.deviceTokens.delete({ token: In(tokens) });
    this.logger.log(`Pruned ${tokens.length} unregistered device token(s)`);
  }
}
