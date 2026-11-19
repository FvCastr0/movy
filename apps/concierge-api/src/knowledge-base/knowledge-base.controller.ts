import {
  Body,
  Controller,
  Get,
  Patch,
  Put,
  UseGuards,
} from '@nestjs/common';
import { KnowledgeBaseService } from './knowledge-base.service';
import { UpdateKnowledgeBaseDto } from './dto/update-knowledge-base.dto';
import { UpdateQuickOpsDto } from './dto/update-quick-ops.dto';
import { TenantJwtGuard } from '../common/guards/tenant-jwt.guard';
import { TenantRolesGuard } from '../common/guards/tenant-roles.guard';
import {
  AuthenticatedTenantUser,
  CurrentTenantUser,
  TenantRoles,
} from '../common/decorators/tenant-user.decorator';

@Controller('knowledge-base')
@UseGuards(TenantJwtGuard, TenantRolesGuard)
export class KnowledgeBaseController {
  constructor(private readonly kbService: KnowledgeBaseService) {}

  @Get()
  async getKnowledgeBase(@CurrentTenantUser() user: AuthenticatedTenantUser) {
    return this.kbService.getKnowledgeBase(user.tenantId);
  }

  @Put()
  @TenantRoles('OWNER')
  async updateKnowledgeBase(
    @CurrentTenantUser() user: AuthenticatedTenantUser,
    @Body() dto: UpdateKnowledgeBaseDto,
  ) {
    return this.kbService.updateFullKnowledgeBase(user.tenantId, dto);
  }

  @Patch('quick-ops')
  @TenantRoles('OWNER', 'ATTENDANT')
  async updateQuickOps(
    @CurrentTenantUser() user: AuthenticatedTenantUser,
    @Body() dto: UpdateQuickOpsDto,
  ) {
    return this.kbService.updateQuickOps(user.tenantId, dto);
  }

  @Get('prompt-preview')
  @TenantRoles('OWNER')
  async previewSystemPrompt(
    @CurrentTenantUser() user: AuthenticatedTenantUser,
  ) {
    return this.kbService.compileSystemPrompt(user.tenantId);
  }
}
