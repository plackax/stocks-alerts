import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class FcmTokenDto {
  @ApiProperty({ description: 'Firebase Cloud Messaging device registration token' })
  @IsString()
  @IsNotEmpty()
  token: string;
}
