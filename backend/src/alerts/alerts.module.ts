import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StocksModule } from '../stocks/stocks.module';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { AlertEntity } from './entities/alert.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AlertEntity]), AuthModule, NotificationsModule, StocksModule],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
