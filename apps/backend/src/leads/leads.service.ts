import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EvolutionService } from '../evolution/evolution.service';
import { CaptureLeadDto } from './dto/capture-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { CreateOutboundLeadDto } from './dto/create-outbound-lead.dto';
import { UpdateCrmStageDto } from './dto/update-crm-stage.dto';
import { CrmMetricsResponseDto } from './dto/crm-metrics-response.dto';
import { NotificationStatus, LeadOriginType, LeadStage } from '@prisma/client';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly evolutionService: EvolutionService,
  ) { }

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

  async findAll(includeConverted = false) {
    return this.prisma.lead.findMany({
      where: includeConverted
        ? {}
        : {
          client: null, // Filtra leads que já foram convertidos em cliente, mantendo o funil SDR limpo
        },
      include: {
        qualification: true,
        client: {
          select: { id: true, status: true },
        },
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

  // ==============================================================================
  // CRM COMERCIAL (PIPELINE & PROSPECÇÃO ATIVA)
  // ==============================================================================

  async createOutboundLead(dto: CreateOutboundLeadDto, userId?: string) {
    this.logger.log(`Registrando novo lead outbound manual: ${dto.nome} (${dto.deliveryNome})`);

    return this.prisma.lead.create({
      data: {
        nome: dto.nome.trim(),
        whatsapp: dto.whatsapp.trim(),
        deliveryNome: dto.deliveryNome.trim(),
        segmento: dto.segmento.trim(),
        cidade: dto.cidade.trim(),
        instagramCardapio: dto.instagramCardapio ? dto.instagramCardapio.trim() : null,
        dealValue: dto.dealValue !== undefined ? dto.dealValue : null,
        problemaPrincipal: dto.problemaPrincipal ? dto.problemaPrincipal.trim() : null,
        origem: 'PROSPECCAO_ATIVA',
        origemTipo: LeadOriginType.OUTBOUND,
        stage: LeadStage.NOVO,
        notificationStatus: NotificationStatus.SENT, // Não dispara no grupo receptivo da landing page
        sdrResponsibleId: userId || null,
        qualification: {
          create: {},
        },
      },
      include: {
        qualification: true,
        sdrResponsible: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async updateCrmStage(id: string, dto: UpdateCrmStageDto) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      throw new NotFoundException(`Lead com ID ${id} não foi encontrado.`);
    }

    if (dto.stage === LeadStage.PERDIDO && !dto.lostReason?.trim()) {
      throw new BadRequestException('O motivo de perda é obrigatório ao marcar o lead como PERDIDO.');
    }

    if (dto.stage === LeadStage.REUNIAO_AGENDADA && !dto.meetingDate) {
      throw new BadRequestException('A data e horário da reunião são obrigatórios para agendamentos.');
    }

    return this.prisma.lead.update({
      where: { id },
      data: {
        stage: dto.stage,
        lostReason: dto.stage === LeadStage.PERDIDO ? dto.lostReason?.trim() : undefined,
        meetingDate: dto.meetingDate ? new Date(dto.meetingDate) : undefined,
        dealValue: dto.dealValue !== undefined ? dto.dealValue : undefined,
      },
      include: {
        qualification: true,
        client: {
          select: { id: true, status: true },
        },
        sdrResponsible: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async findAllCrm(origemTipo?: LeadOriginType, search?: string) {
    const where: any = {};

    if (origemTipo) {
      where.origemTipo = origemTipo;
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { nome: { contains: term, mode: 'insensitive' } },
        { deliveryNome: { contains: term, mode: 'insensitive' } },
        { whatsapp: { contains: term, mode: 'insensitive' } },
        { cidade: { contains: term, mode: 'insensitive' } },
        { segmento: { contains: term, mode: 'insensitive' } },
      ];
    }

    return this.prisma.lead.findMany({
      where,
      include: {
        qualification: true,
        client: {
          select: { id: true, status: true },
        },
        sdrResponsible: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getCrmMetrics(origemTipo?: LeadOriginType): Promise<CrmMetricsResponseDto> {
    const where = origemTipo ? { origemTipo } : {};
    const leads = await this.prisma.lead.findMany({
      where,
      select: {
        id: true,
        stage: true,
        origemTipo: true,
        dealValue: true,
        meetingDate: true,
      },
    });

    const totalLeads = leads.length;
    let totalInbound = 0;
    let totalOutbound = 0;
    let agendadosCount = 0;
    let noShowCount = 0;
    let fechadosCount = 0;
    let reunioesRealizadasCount = 0;
    let totalPipelineValue = 0;
    let closedRevenueValue = 0;

    const stageCounts: Record<string, number> = {
      NOVO: 0,
      CONTATO_INICIADO: 0,
      REUNIAO_AGENDADA: 0,
      NO_SHOW: 0,
      PROPOSTA_ENVIADA: 0,
      FECHADO: 0,
      PERDIDO: 0,
    };

    for (const lead of leads) {
      if (lead.origemTipo === LeadOriginType.INBOUND) totalInbound++;
      if (lead.origemTipo === LeadOriginType.OUTBOUND) totalOutbound++;

      const normalizedStage = (lead.stage as any) === 'GANHO' ? 'FECHADO' : lead.stage;
      if (stageCounts[normalizedStage] !== undefined) {
        stageCounts[normalizedStage]++;
      }

      // Conta leads que chegaram na fase de agendamento ou além
      const teveAgendamento =
        lead.meetingDate !== null ||
        ['REUNIAO_AGENDADA', 'NO_SHOW', 'PROPOSTA_ENVIADA', 'FECHADO', 'GANHO'].includes(lead.stage as any);

      if (teveAgendamento) {
        agendadosCount++;
      }

      if (lead.stage === LeadStage.NO_SHOW) {
        noShowCount++;
      }

      // Reuniões que foram efetivamente realizadas (passaram de no-show para proposta ou fechamento)
      if (['PROPOSTA_ENVIADA', 'FECHADO', 'GANHO'].includes(lead.stage as any)) {
        reunioesRealizadasCount++;
      }

      if (lead.stage === LeadStage.FECHADO || (lead.stage as any) === 'GANHO') {
        fechadosCount++;
        if (lead.dealValue) closedRevenueValue += lead.dealValue;
      }

      // Pipeline ativo (proposta ou reunião)
      if (['REUNIAO_AGENDADA', 'PROPOSTA_ENVIADA'].includes(lead.stage as any)) {
        if (lead.dealValue) totalPipelineValue += lead.dealValue;
      }
    }

    const bookingRate = totalLeads > 0 ? Number(((agendadosCount / totalLeads) * 100).toFixed(1)) : 0;
    const noShowRate = agendadosCount > 0 ? Number(((noShowCount / agendadosCount) * 100).toFixed(1)) : 0;
    const winRate = reunioesRealizadasCount > 0 ? Number(((fechadosCount / reunioesRealizadasCount) * 100).toFixed(1)) : 0;

    return {
      totalLeads,
      totalInbound,
      totalOutbound,
      bookingRate,
      noShowRate,
      winRate,
      totalPipelineValue,
      closedRevenueValue,
      stageCounts,
    };
  }
}
