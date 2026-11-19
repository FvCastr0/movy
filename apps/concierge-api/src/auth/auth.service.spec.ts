import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { TenantJwtGuard } from '../common/guards/tenant-jwt.guard';
import { TenantRolesGuard } from '../common/guards/tenant-roles.guard';

describe('Multi-Tenant Auth & Users (OWASP A01 Anti-IDOR & A02 Auth)', () => {
  let jwtService: JwtService;
  let authService: AuthService;
  let usersService: UsersService;
  let mockPrisma: any;

  beforeEach(() => {
    process.env.CONCIERGE_JWT_SECRET = 'test_concierge_jwt_secret_2026';
    jwtService = new JwtService({
      secret: process.env.CONCIERGE_JWT_SECRET,
      signOptions: { expiresIn: '12h' },
    });

    mockPrisma = {
      deliveryUser: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    authService = new AuthService(mockPrisma, jwtService);
    usersService = new UsersService(mockPrisma);
  });

  describe('AuthService.login', () => {
    it('authenticates active user of an active tenant and issues scoped JWT with tenantId', async () => {
      const hash = await bcrypt.hash('Password123!', 12);
      mockPrisma.deliveryUser.findUnique.mockResolvedValue({
        id: 'user-1',
        tenantId: 'tenant-A',
        name: 'Maria Atendente',
        email: 'maria@pizzaria.com',
        passwordHash: hash,
        role: 'ATTENDANT',
        isActive: true,
        tenant: {
          id: 'tenant-A',
          name: 'Pizzaria Napoli',
          isActive: true,
          aiGlobalEnabled: true,
        },
      });

      const res = await authService.login({
        email: 'MARIA@pizzaria.com',
        password: 'Password123!',
      });

      expect(res.accessToken).toBeDefined();
      expect(res.user.tenantId).toBe('tenant-A');
      expect((res.user as any).passwordHash).toBeUndefined();

      const decoded = jwtService.verify(res.accessToken);
      expect(decoded.sub).toBe('user-1');
      expect(decoded.tenantId).toBe('tenant-A');
      expect(decoded.role).toBe('ATTENDANT');
    });

    it('blocks login when MOVY has deactivated the delivery tenant (tenant.isActive === false)', async () => {
      const hash = await bcrypt.hash('Password123!', 12);
      mockPrisma.deliveryUser.findUnique.mockResolvedValue({
        id: 'user-1',
        tenantId: 'tenant-A',
        email: 'maria@pizzaria.com',
        passwordHash: hash,
        role: 'OWNER',
        isActive: true,
        tenant: {
          id: 'tenant-A',
          name: 'Pizzaria Inadimplente',
          isActive: false,
        },
      });

      await expect(
        authService.login({
          email: 'maria@pizzaria.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects invalid password with generic message (prevents account enumeration)', async () => {
      const hash = await bcrypt.hash('Password123!', 12);
      mockPrisma.deliveryUser.findUnique.mockResolvedValue({
        id: 'user-1',
        tenantId: 'tenant-A',
        email: 'maria@pizzaria.com',
        passwordHash: hash,
        role: 'OWNER',
        isActive: true,
        tenant: { id: 'tenant-A', isActive: true },
      });

      await expect(
        authService.login({
          email: 'maria@pizzaria.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('A01: Broken Access Control (Anti-IDOR & TenantRolesGuard)', () => {
    it('prevents Tenant A OWNER from toggling status of a user belonging to Tenant B (Anti-IDOR)', async () => {
      // findFirst filtra por { id: targetUserId, tenantId: callerTenantId }
      mockPrisma.deliveryUser.findFirst.mockResolvedValue(null);

      await expect(
        usersService.updateUserStatus('tenant-A', 'user-from-tenant-B', false),
      ).rejects.toThrow(/Usuário não encontrado neste delivery/i);

      expect(mockPrisma.deliveryUser.findFirst).toHaveBeenCalledWith({
        where: { id: 'user-from-tenant-B', tenantId: 'tenant-A' },
      });
    });

    it('blocks ATTENDANT from accessing OWNER-only routes via TenantRolesGuard', () => {
      const reflector = new Reflector();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['OWNER']);
      const rolesGuard = new TenantRolesGuard(reflector);

      const ctx = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            user: { sub: 'u1', tenantId: 'tenant-A', role: 'ATTENDANT' },
          }),
        }),
      } as unknown as ExecutionContext;

      expect(() => rolesGuard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('verifies Bearer JWT and attaches user context via TenantJwtGuard', async () => {
      const token = jwtService.sign({
        sub: 'user-1',
        email: 'dono@delivery.com',
        role: 'OWNER',
        tenantId: 'tenant-A',
      });

      mockPrisma.deliveryUser.findUnique.mockResolvedValue({
        id: 'user-1',
        tenantId: 'tenant-A',
        isActive: true,
        role: 'OWNER',
        tenant: { isActive: true },
      });

      const jwtGuard = new TenantJwtGuard(jwtService, mockPrisma);
      const reqObj: any = {
        headers: { authorization: `Bearer ${token}` },
      };

      const ctx = {
        switchToHttp: () => ({
          getRequest: () => reqObj,
        }),
      } as unknown as ExecutionContext;

      expect(await jwtGuard.canActivate(ctx)).toBe(true);
      expect(reqObj.user.tenantId).toBe('tenant-A');
    });
  });
});
