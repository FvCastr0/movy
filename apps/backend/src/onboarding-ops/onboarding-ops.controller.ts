import { Controller, Get, Patch, Post, Param, Body, UseGuards } from '@nestjs/common';
import { OnboardingOpsService } from './onboarding-ops.service';
import { UpdateOnboardingStageDto } from './dto/update-onboarding-stage.dto';
import { UpdateChecklistDto } from './dto/update-checklist.dto';
import { CreateDailyMetricsDto } from './dto/create-daily-metrics.dto';
import { ImportRevenueCsvDto } from './dto/import-revenue-csv.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('onboarding')
export class OnboardingOpsController {
  constructor(private readonly onboardingService: OnboardingOpsService) {}

  @Get('pipeline')
  async getPipeline() {
    return this.onboardingService.getOnboardingPipeline();
  }

  @Patch(':clientId/stage')
  async updateStage(
    @Param('clientId') clientId: string,
    @Body() dto: UpdateOnboardingStageDto,
  ) {
    return this.onboardingService.updateStage(clientId, dto);
  }

  @Patch(':clientId/checklist')
  async updateChecklist(
    @Param('clientId') clientId: string,
    @Body() dto: UpdateChecklistDto,
  ) {
    return this.onboardingService.updateChecklist(clientId, dto);
  }

  @Get(':clientId/risk-status')
  async getRiskStatus(@Param('clientId') clientId: string) {
    return this.onboardingService.getRiskStatus(clientId);
  }

  @Post(':clientId/revenue-csv')
  async importRevenueCsv(
    @Param('clientId') clientId: string,
    @Body() dto: ImportRevenueCsvDto,
  ) {
    return this.onboardingService.parseRevenueCsv(clientId, dto);
  }

  @Post(':clientId/daily-metrics')
  async createDailyMetrics(
    @Param('clientId') clientId: string,
    @Body() dto: CreateDailyMetricsDto,
  ) {
    return this.onboardingService.createDailyMetrics(clientId, dto);
  }
}
