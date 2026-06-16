import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { StocksService } from './stocks.service';

@ApiTags('stocks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stocks')
export class StocksController {
  constructor(private readonly stocks: StocksService) {}

  @Get()
  @ApiOperation({ summary: 'List tracked stocks with their latest price and change' })
  @ApiResponse({ status: 200, description: 'Array of tracked stock prices.' })
  getStocks() {
    return this.stocks.getTrackedStocks();
  }
}
