import { Module } from '@nestjs/common';
import { StocksModule } from '../stocks/stocks.module';
import { DevController } from './dev.controller';

@Module({
  imports: [StocksModule],
  controllers: [DevController],
})
export class DevModule {}
