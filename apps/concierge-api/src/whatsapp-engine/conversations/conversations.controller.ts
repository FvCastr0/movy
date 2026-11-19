import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConversationStatus } from '@prisma/client';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ConversationsService } from './conversations.service';
import { TenantJwtGuard } from '../../common/guards/tenant-jwt.guard';
import {
  AuthenticatedTenantUser,
  CurrentTenantUser,
} from '../../common/decorators/tenant-user.decorator';

export class ManualHandoffDto {
  @IsString()
  @IsOptional()
  @MaxLength(150)
  reason?: string;
}

@Controller('conversations')
@UseGuards(TenantJwtGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get('handoff-queue')
  async getHandoffQueue(@CurrentTenantUser() user: AuthenticatedTenantUser) {
    return this.conversationsService.listHandoffQueue(user.tenantId);
  }

  @Get()
  async listConversations(
    @CurrentTenantUser() user: AuthenticatedTenantUser,
    @Query('status') status?: ConversationStatus,
  ) {
    return this.conversationsService.listConversations(user.tenantId, status);
  }

  @Get(':id/messages')
  async getConversationMessages(
    @CurrentTenantUser() user: AuthenticatedTenantUser,
    @Param('id') conversationId: string,
  ) {
    return this.conversationsService.getConversationMessages(
      user.tenantId,
      conversationId,
    );
  }

  @Patch(':id/resolve')
  async resolveAndReturnToAi(
    @CurrentTenantUser() user: AuthenticatedTenantUser,
    @Param('id') conversationId: string,
  ) {
    return this.conversationsService.resolveAndReturnToAi(
      user.tenantId,
      conversationId,
    );
  }

  @Patch(':id/handoff')
  async forceHumanHandoff(
    @CurrentTenantUser() user: AuthenticatedTenantUser,
    @Param('id') conversationId: string,
    @Body() dto: ManualHandoffDto,
  ) {
    return this.conversationsService.forceHumanHandoff(
      user.tenantId,
      conversationId,
      dto.reason,
    );
  }
}
