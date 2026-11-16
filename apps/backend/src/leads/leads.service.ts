import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EvolutionService } from '../evolution/evolution.service';
import { CaptureLeadDto } from './dto/capture-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { NotificationStatus } from '@prisma/client';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly evolutionService: EvolutionService,
  ) {}

  async captureLead(dto: CaptureLeadDto) {
    this.logger.log(`Recebendo novo lead da Landing Page: ${dto.nome} (${dto.deliveryNome})`);

    // 1. Persistência prioritária e imediata no PostgreSQL com transação
    const lead = await this.prisma.lead.create({
      data: {
        nome: dto.nome.trim(),
        whatsapp: dto.whatsapp.trim(),
        deliveryNome: dto.deliveryNome.trim(),
        segmento: dto.segmento.trim(),
        cidade: dto.cidade.trim(),
        origem: 'LANDING_PAGE',
        notificationStatus: NotificationStatus.PENDING,
        qualification: {
          create: {},
        },
      },
      include: {
        qualification: true,
      },
    });

    this.logger.log(`Lead salvo no banco de dados com ID: ${lead.id}. Iniciando disparo para WhatsApp...`);

    // 2. Disparo assíncrono para o grupo no WhatsApp sem bloquear a resposta da requisição
    this.dispatchWhatsAppNotification(lead.id, {
      nome: lead.nome,
      whatsapp: lead.whatsapp,
      deliveryNome: lead.deliveryNome,
      segmento: lead.segmento,
      cidade: lead.cidade,
      createdAt: lead.createdAt,
    });

    return {
      success: true,
      message: 'Lead recebido com sucesso!',
      leadId: lead.id,
    };
  }

  private async dispatchWhatsAppNotification(leadId: string, payload: any) {
    try {
      const result = await this.evolutionService.sendLeadNotification(payload);

      await this.prisma.lead.update({
        where: { id: leadId },
        data: {
          notificationStatus: result.success ? NotificationStatus.SENT : NotificationStatus.FAILED,
          notificationError: result.error || null,
        },
      });
    } catch (err: any) {
      this.logger.error(`Erro inesperado ao atualizar status de notificação do lead ${leadId}: ${err.message}`);
      await this.prisma.lead.update({
        where: { id: leadId },
        data: {
          notificationStatus: NotificationStatus.FAILED,
          notificationError: err.message,
        },
      }).catch(() => null);
    }
  }

  async findAll() {
    return this.prisma.lead.findMany({
      include: {
        qualification: true,
        sdrResponsible: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.lead.findUnique({
      where: { id },
      include: {
        qualification: true,
        followUps: {
          include: {
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        sdrResponsible: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async updateLead(id: string, dto: UpdateLeadDto) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      throw new NotFoundException(`Lead com ID ${id} não foi encontrado.`);
    }

    return this.prisma.lead.update({
      where: { id },
      data: {
        ...dto,
        faturamentoMensal: dto.faturamentoMensal !== undefined ? dto.faturamentoMensal : undefined,
        pedidosMensais: dto.pedidosMensais !== undefined ? dto.pedidosMensais : undefined,
        ticketMedio: dto.ticketMedio !== undefined ? dto.ticketMedio : undefined,
        midiaAtualMensal: dto.midiaAtualMensal !== undefined ? dto.midiaAtualMensal : undefined,
      },
      include: {
        qualification: true,
        sdrResponsible: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }
}
