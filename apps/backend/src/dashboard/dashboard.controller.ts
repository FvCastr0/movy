import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService, DashboardOverviewResponse } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  async getOverview(
    @Query('clientPeriod') clientPeriod?: 'month' | 'all_time',
    @Query('leadDays') leadDays?: string,
  ): Promise<DashboardOverviewResponse> {
    const period = clientPeriod === 'all_time' ? 'all_time' : 'month';
    const parsedDays = Number(leadDays);
    const validDays = [14, 30, 90, 180];
    const days = validDays.includes(parsedDays) ? parsedDays : 14;
    return this.dashboardService.getOverview(period, days);
  }
}
