import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { FIREBASE_ADMIN, NotificationsService } from './notifications.service';

@Module({
  providers: [
    NotificationsService,
    {
      provide: FIREBASE_ADMIN,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logger = new Logger('FirebaseAdmin');
        const projectId = config.get<string>('FIREBASE_PROJECT_ID');
        const clientEmail = config.get<string>('FIREBASE_CLIENT_EMAIL');
        const privateKey = config.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');
        if (!projectId || !clientEmail || !privateKey) {
          logger.warn('Firebase credentials missing, push notifications disabled');
          return null;
        }
        if (getApps().length) {
          return getApp();
        }
        return initializeApp({
          credential: cert({ projectId, clientEmail, privateKey }),
        });
      },
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
