import { Controller, HttpCode, HttpStatus, Inject, NotFoundException, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { PRICE_PROVIDER, PriceProvider } from '../stocks/price-provider';
import { TRACKED_SYMBOLS } from '../stocks/stock-price';

@ApiTags('dev')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dev')
export class DevController {
  private interval: NodeJS.Timeout | null = null;
  private prices = new Map<string, number>();

  constructor(@Inject(PRICE_PROVIDER) private readonly provider: PriceProvider) {}

  @Post('simulate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start the price tick simulator (non-production only)' })
  @ApiResponse({ status: 200, description: 'Simulator started or already running.' })
  @ApiResponse({ status: 404, description: 'Not available in production.' })
  start() {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException();
    }
    if (this.interval) {
      return { status: 'already_running' };
    }
    for (const s of this.provider.getPrices()) {
      this.prices.set(s.symbol, s.price > 0 ? s.price : 100);
    }
    this.interval = setInterval(() => {
      for (const symbol of Object.keys(TRACKED_SYMBOLS)) {
        const current = this.prices.get(symbol) ?? 100;
        const pct = Math.random() * 0.004 - 0.002;
        const next = Math.max(0.01, current + current * pct);
        this.prices.set(symbol, next);
        this.provider.simulateTick(symbol, next);
      }
    }, 1500);
    return { status: 'started', intervalMs: 1500, symbols: Object.keys(TRACKED_SYMBOLS) };
  }

  @Post('simulate/stop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stop the price tick simulator (non-production only)' })
  @ApiResponse({ status: 200, description: 'Simulator stopped.' })
  @ApiResponse({ status: 404, description: 'Not available in production.' })
  stop() {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException();
    }
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      this.prices.clear();
    }
    return { status: 'stopped' };
  }
}
