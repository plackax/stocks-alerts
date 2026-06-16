import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';
import { TRACKED_SYMBOLS } from '../../stocks/stock-price';

export class CreateAlertDto {
  @ApiProperty({ enum: Object.keys(TRACKED_SYMBOLS), example: 'AAPL' })
  @IsString()
  @IsNotEmpty()
  @IsIn(Object.keys(TRACKED_SYMBOLS))
  symbol: string;

  @ApiProperty({ minimum: 0, exclusiveMinimum: true, example: 150 })
  @IsNumber()
  @IsPositive()
  targetPrice: number;
}
