import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InternalApiKeyGuard } from '../common/guards/internal-api-key.guard';
import { TenantsService } from './tenants.service';
import { SyncTenantDto } from './dto/sync-tenant.dto';

@Controller('internal/tenants')
@UseGuards(InternalApiKeyGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post('sync')
  async syncTenant(@Body() dto: SyncTenantDto) {
    return this.tenantsService.syncTenantFromMovy(dto);
  }

  @Get(':movyClientId/summary')
  async getTenantSummary(
    @Param('movyClientId') movyClientId: string,
    @Query('periodStart') periodStart?: string,
    @Query('periodEnd') periodEnd?: string,
  ) {
    return this.tenantsService.getTenantSummaryForMovy(
      movyClientId,
      periodStart,
      periodEnd,
    );
  }
}
