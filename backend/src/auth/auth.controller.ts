import { Body, Controller, HttpCode, HttpStatus, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle, seconds } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { AuthUser, CurrentUser } from './current-user.decorator';
import { FcmTokenDto } from './dto/fcm-token.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Throttle({ default: { limit: 10, ttl: seconds(60) } })
  @Post('register')
  @ApiOperation({ summary: 'Register a new account and receive an access token' })
  @ApiResponse({ status: 201, description: 'Account created; returns a JWT access token.' })
  @ApiResponse({ status: 409, description: 'Email already registered.' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email, dto.password);
  }

  @Throttle({ default: { limit: 10, ttl: seconds(60) } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate with email and password' })
  @ApiResponse({ status: 200, description: 'Returns a JWT access token.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('fcm-token')
  @ApiOperation({ summary: 'Save or update the FCM token for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Token stored.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  saveFcmToken(@CurrentUser() user: AuthUser, @Body() dto: FcmTokenDto) {
    return this.auth.saveFcmToken(user.id, dto.token);
  }
}
