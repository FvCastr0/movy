import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';

export interface AuthenticatedTenantUser {
  sub: string;
  email: string;
  role: 'OWNER' | 'ATTENDANT';
  tenantId: string;
}

export const TENANT_ROLES_KEY = 'concierge_tenant_roles';
export const TenantRoles = (...roles: Array<'OWNER' | 'ATTENDANT'>) =>
  SetMetadata(TENANT_ROLES_KEY, roles);

export const CurrentTenantUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedTenantUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
