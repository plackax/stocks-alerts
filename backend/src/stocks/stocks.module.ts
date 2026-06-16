import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FinnhubService } from './finnhub.service';
import { PRICE_PROVIDER } from './price-provider';
import { StocksController } from './stocks.controller';
import { StocksGateway } from './stocks.gateway';
import { StocksService } from './stocks.service';

@Module({
  imports: [AuthModule],
  controllers: [StocksController],
  providers: [
    FinnhubService,
    { provide: PRICE_PROVIDER, useExisting: FinnhubService },
    StocksService,
    StocksGateway,
  ],
  exports: [PRICE_PROVIDER],
})
export class StocksModule {}
