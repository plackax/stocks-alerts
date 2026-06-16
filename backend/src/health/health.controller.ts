import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';

@ApiTags('health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Liveness and database connectivity check' })
  @ApiResponse({ status: 200, description: 'Service and database are healthy.' })
  @ApiResponse({ status: 503, description: 'A health indicator reported a failure.' })
  check() {
    return this.health.check([() => this.db.pingCheck('database')]);
  }
}
