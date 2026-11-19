import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import {
  CreateDeliveryUserDto,
  UpdateDeliveryUserStatusDto,
} from './dto/create-delivery-user.dto';
import { TenantJwtGuard } from '../common/guards/tenant-jwt.guard';
import { TenantRolesGuard } from '../common/guards/tenant-roles.guard';
import {
  AuthenticatedTenantUser,
  CurrentTenantUser,
  TenantRoles,
} from '../common/decorators/tenant-user.decorator';

@Controller('users')
@UseGuards(TenantJwtGuard, TenantRolesGuard)
@TenantRoles('OWNER')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async listUsers(@CurrentTenantUser() user: AuthenticatedTenantUser) {
    return this.usersService.listTenantUsers(user.tenantId);
  }

  @Post()
  async createUser(
    @CurrentTenantUser() user: AuthenticatedTenantUser,
    @Body() dto: CreateDeliveryUserDto,
  ) {
    return this.usersService.createTenantUser(user.tenantId, dto);
  }

  @Patch(':id/status')
  async updateStatus(
    @CurrentTenantUser() user: AuthenticatedTenantUser,
    @Param('id') targetUserId: string,
    @Body() dto: UpdateDeliveryUserStatusDto,
  ) {
    return this.usersService.updateUserStatus(
      user.tenantId,
      targetUserId,
      dto.isActive,
    );
  }
}
