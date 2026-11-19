import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TenantJwtGuard } from '../common/guards/tenant-jwt.guard';
import { TenantRolesGuard } from '../common/guards/tenant-roles.guard';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret:
        process.env.CONCIERGE_JWT_SECRET ||
        'movy_concierge_tenant_jwt_secret_2026_hardened',
      signOptions: { expiresIn: '12h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, TenantJwtGuard, TenantRolesGuard, RateLimitGuard],
  exports: [AuthService, TenantJwtGuard, TenantRolesGuard],
})
export class AuthModule {}
