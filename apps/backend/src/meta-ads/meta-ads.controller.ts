import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MetaAdsService } from './meta-ads.service';
import { SaveMetaConfigDto } from './dto/save-meta-config.dto';
import { QueryInsightsDto } from './dto/query-insights.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('meta-ads')
export class MetaAdsController {
  constructor(private readonly metaAdsService: MetaAdsService) {}

  @Post('clients/:clientId/config')
  async saveConfig(
    @Param('clientId') clientId: string,
    @Body() dto: SaveMetaConfigDto
  ) {
    return this.metaAdsService.saveConfig(clientId, dto);
  }

  @Get('clients/:clientId/status')
  async getStatus(@Param('clientId') clientId: string) {
    return this.metaAdsService.getConfigStatus(clientId);
  }

  @Get('clients/:clientId/insights')
  async getInsights(
    @Param('clientId') clientId: string,
    @Query() query: QueryInsightsDto
  ) {
    return this.metaAdsService.fetchAccountInsights(clientId, query);
  }

  @Post('clients/:clientId/sync')
  async syncSnapshot(@Param('clientId') clientId: string) {
    return this.metaAdsService.syncSnapshotToMetrics(clientId);
  }
}
