import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ format: 'email', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8, example: 'Test1234!' })
  @IsString()
  @MinLength(8)
  password: string;
}
