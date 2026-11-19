import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EvolutionService } from '../evolution/evolution.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly evolutionService: EvolutionService,
  ) {}

  /**
   * Cria uma notificação no banco de dados e opcionalmente despacha no WhatsApp do usuário.
   */
  async create(dto: CreateNotificationDto, sendWhatsApp = true) {
    this.logger.log(`Registrando notificação "${dto.title}" para usuário ${dto.userId}`);

    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        title: dto.title,
        message: dto.message,
        type: dto.type || 'SYSTEM',
        link: dto.link || null,
        metadata: dto.metadata || {},
      },
    });

    const shouldSendWa = sendWhatsApp && dto.sendWhatsApp !== false;

    if (shouldSendWa) {
      // Executa envio WhatsApp de forma assíncrona (não-bloqueante)
      this.dispatchWhatsApp(dto.userId, dto.title, dto.message, dto.link).catch((err) => {
        this.logger.warn(`Erro no disparo de WhatsApp para notificação ${notification.id}: ${err.message}`);
      });
    }

    return notification;
  }

  private async dispatchWhatsApp(userId: string, title: string, message: string, link?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, phone: true },
    });

    if (!user || !user.phone) {
      this.logger.debug(`Usuário ${userId} não possui telefone cadastrado. Notificação WhatsApp ignorada.`);
      return;
    }

    const firstName = user.name ? user.name.split(' ')[0] : 'Colaborador';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://system.assessoriamovy.com';
    const destinationUrl = link ? `${baseUrl}${link}` : baseUrl;

    const waLines = [
      `🔔 *MOVY: ${title}*`,
      '',
      `Olá, *${firstName}*!`,
      message,
      '',
      `👉 *Acessar painel:* ${destinationUrl}`,
    ];

    await this.evolutionService.sendCustomTextMessage(user.phone, waLines.join('\n'));
  }

  /**
   * Lista as notificações do usuário atual e retorna o total de não lidas.
   */
  async findAll(userId: string, query: NotificationQueryDto) {
    const where: any = { userId };

    if (query.unreadOnly === 'true') {
      where.read = false;
    }

    const limit = query.limit ? Math.min(Math.max(query.limit, 1), 100) : 30;

    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.notification.count({
        where: {
          userId,
          read: false,
        },
      }),
    ]);

    return {
      items,
      unreadCount,
    };
  }

  /**
   * Marca uma notificação individual como lida.
   */
  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notificação não encontrada.');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  /**
   * Marca todas as notificações pendentes do usuário como lidas.
   */
  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: { read: true },
    });

    return {
      success: true,
      updatedCount: result.count,
    };
  }
}
