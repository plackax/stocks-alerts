import { Inject, Injectable } from '@nestjs/common';
import { PRICE_PROVIDER, PriceProvider } from './price-provider';

@Injectable()
export class StocksService {
  constructor(@Inject(PRICE_PROVIDER) private readonly prices: PriceProvider) {}

  getTrackedStocks() {
    return this.prices.getPrices();
  }
}
