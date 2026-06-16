import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule, seconds } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertsModule } from './alerts/alerts.module';
import { AuthModule } from './auth/auth.module';
import { envValidationSchema } from './config/env.validation';
import { DevModule } from './dev/dev.module';
import { HealthModule } from './health/health.module';
import { NotificationsModule } from './notifications/notifications.module';
import { StocksModule } from './stocks/stocks.module';

const devModules = process.env.NODE_ENV !== 'production' ? [DevModule] : [];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),
    ThrottlerModule.forRoot([{ ttl: seconds(60), limit: 100 }]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.get<string>('DATABASE_URL');
        const connection = databaseUrl
          ? { url: databaseUrl }
          : {
              host: config.getOrThrow<string>('DATABASE_HOST'),
              port: parseInt(config.getOrThrow<string>('DATABASE_PORT'), 10),
              database: config.getOrThrow<string>('DATABASE_NAME'),
              username: config.getOrThrow<string>('DATABASE_USER'),
              password: config.getOrThrow<string>('DATABASE_PASSWORD'),
            };
        const ssl =
          config.get<string>('DATABASE_SSL') === 'true'
            ? { ssl: { rejectUnauthorized: false } }
            : {};
        return {
          type: 'postgres' as const,
          ...connection,
          ...ssl,
          autoLoadEntities: true,
          synchronize: process.env.NODE_ENV !== 'production',
          migrations: [__dirname + '/migrations/*.{js,ts}'],
          migrationsRun: process.env.NODE_ENV === 'production',
        };
      },
    }),
    AuthModule,
    NotificationsModule,
    AlertsModule,
    StocksModule,
    HealthModule,
    ...devModules,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
