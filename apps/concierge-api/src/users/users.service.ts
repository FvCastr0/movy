import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeliveryUserDto } from './dto/create-delivery-user.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async listTenantUsers(tenantId: string) {
    const users = await this.prisma.deliveryUser.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });

    return users.map((u) => ({
      id: u.id,
      tenantId: u.tenantId,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
    }));
  }

  async createTenantUser(tenantId: string, dto: CreateDeliveryUserDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const existing = await this.prisma.deliveryUser.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new ConflictException('Já existe um usuário com este e-mail.');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const created = await this.prisma.deliveryUser.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: dto.role || 'ATTENDANT',
        isActive: true,
      },
    });

    return {
      id: created.id,
      tenantId: created.tenantId,
      name: created.name,
      email: created.email,
      role: created.role,
      isActive: created.isActive,
      createdAt: created.createdAt,
    };
  }

  async updateUserStatus(
    tenantId: string,
    targetUserId: string,
    isActive: boolean,
  ) {
    // Anti-IDOR (OWASP A01): Busca sempre combinando id + tenantId do chamador
    const target = await this.prisma.deliveryUser.findFirst({
      where: { id: targetUserId, tenantId },
    });

    if (!target) {
      throw new NotFoundException('Usuário não encontrado neste delivery.');
    }

    const updated = await this.prisma.deliveryUser.update({
      where: { id: target.id },
      data: { isActive },
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      isActive: updated.isActive,
    };
  }
}
