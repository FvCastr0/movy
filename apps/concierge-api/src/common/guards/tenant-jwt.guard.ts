import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedTenantUser } from '../decorators/tenant-user.decorator';

@Injectable()
export class TenantJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;

    if (
      typeof authHeader !== 'string' ||
      !authHeader.startsWith('Bearer ')
    ) {
      throw new UnauthorizedException('Token de autenticação ausente');
    }

    const token = authHeader.slice(7).trim();
    let payload: AuthenticatedTenantUser;

    try {
      payload = this.jwtService.verify<AuthenticatedTenantUser>(token, {
        secret:
          process.env.CONCIERGE_JWT_SECRET ||
          'movy_concierge_tenant_jwt_secret_2026_hardened',
      });
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    if (!payload?.sub || !payload?.tenantId) {
      throw new UnauthorizedException('Token malformado');
    }

    const dbUser = await this.prisma.deliveryUser.findUnique({
      where: { id: payload.sub },
      include: { tenant: true },
    });

    if (!dbUser || !dbUser.isActive || dbUser.tenantId !== payload.tenantId) {
      throw new UnauthorizedException('Usuário inativo ou sessão revogada');
    }

    if (!dbUser.tenant?.isActive) {
      throw new ForbiddenException(
        'O módulo de IA deste delivery está temporariamente desativado pela MOVY.',
      );
    }

    request.user = {
      sub: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      tenantId: dbUser.tenantId,
    } satisfies AuthenticatedTenantUser;

    return true;
  }
}
