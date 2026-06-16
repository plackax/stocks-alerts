import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';

@ApiTags('alerts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a price alert for the authenticated user' })
  @ApiResponse({ status: 201, description: 'Alert created.' })
  @ApiResponse({ status: 400, description: 'Invalid symbol or target price.' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAlertDto) {
    return this.alerts.create(user.id, dto.symbol, dto.targetPrice);
  }

  @Get()
  @ApiOperation({ summary: 'List the authenticated user alerts, newest first' })
  @ApiResponse({ status: 200, description: 'Array of the user alerts.' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.alerts.findByUser(user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete one of the authenticated user alerts' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Alert identifier' })
  @ApiResponse({ status: 200, description: 'Alert deleted.' })
  @ApiResponse({ status: 404, description: 'Alert not found.' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.alerts.remove(user.id, id);
  }
}
