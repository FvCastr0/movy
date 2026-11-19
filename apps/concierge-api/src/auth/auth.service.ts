import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { AuthenticatedTenantUser } from '../common/decorators/tenant-user.decorator';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await this.prisma.deliveryUser.findUnique({
      where: { email: normalizedEmail },
      include: { tenant: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!user.tenant?.isActive) {
      throw new ForbiddenException(
        'O acesso ao Concierge de IA deste delivery está desativado pela MOVY.',
      );
    }

    const payload: AuthenticatedTenantUser = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: user.tenant.name,
        aiGlobalEnabled: user.tenant.aiGlobalEnabled,
      },
    };
  }

  async getMe(currentUser: AuthenticatedTenantUser) {
    const user = await this.prisma.deliveryUser.findUnique({
      where: { id: currentUser.sub },
      include: { tenant: true },
    });

    if (!user || user.tenantId !== currentUser.tenantId) {
      throw new UnauthorizedException('Sessão inválida');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      tenantName: user.tenant.name,
      aiGlobalEnabled: user.tenant.aiGlobalEnabled,
    };
  }
}
