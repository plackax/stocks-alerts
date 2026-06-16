import { Inject, Injectable, Logger } from '@nestjs/common';
import { App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

export const FIREBASE_ADMIN = 'FIREBASE_ADMIN';

interface PriceAlertTarget {
  token: string;
  symbol: string;
  price: number;
}

const UNREGISTERED_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-argument',
]);

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(@Inject(FIREBASE_ADMIN) private readonly app: App | null) {}

  async sendPriceAlerts(targets: PriceAlertTarget[]): Promise<string[]> {
    if (targets.length === 0) {
      return [];
    }
    if (!this.app) {
      this.logger.warn('Firebase Admin not initialized, skipping notifications');
      return [];
    }

    const groups = new Map<string, { symbol: string; price: number; tokens: string[] }>();
    for (const target of targets) {
      const key = `${target.symbol}|${target.price}`;
      const group = groups.get(key);
      if (group) {
        group.tokens.push(target.token);
      } else {
        groups.set(key, { symbol: target.symbol, price: target.price, tokens: [target.token] });
      }
    }

    const messaging = getMessaging(this.app);
    const invalidTokens: string[] = [];
    for (const { symbol, price, tokens } of groups.values()) {
      const pruned = await this.sendGroup(messaging, symbol, price, tokens);
      invalidTokens.push(...pruned);
    }
    return invalidTokens;
  }

  private async sendGroup(
    messaging: ReturnType<typeof getMessaging>,
    symbol: string,
    price: number,
    tokens: string[],
  ): Promise<string[]> {
    try {
      const response = await messaging.sendEachForMulticast({
        tokens,
        notification: {
          title: 'Price Alert',
          body: `${symbol} reached $${price.toFixed(2)}`,
        },
        data: { symbol, price: String(price) },
      });
      this.logger.log(
        `Sent price alert for ${symbol} at $${price.toFixed(2)}: ${response.successCount} delivered, ${response.failureCount} failed`,
      );
      const invalidTokens: string[] = [];
      response.responses.forEach((result, index) => {
        if (result.success) {
          return;
        }
        const code = result.error?.code;
        this.logger.warn(`FCM delivery failed for token #${index} (${symbol}): ${result.error?.message}`);
        if (code && UNREGISTERED_TOKEN_CODES.has(code)) {
          invalidTokens.push(tokens[index]);
        }
      });
      return invalidTokens;
    } catch (error) {
      this.logger.error(
        `Failed to send FCM notifications for ${symbol}`,
        error instanceof Error ? error.stack : String(error),
      );
      return [];
    }
  }
}
