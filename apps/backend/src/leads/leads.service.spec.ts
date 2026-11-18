import { Test, TestingModule } from '@nestjs/testing';
import { LeadsService } from './leads.service';
import { PrismaService } from '../prisma/prisma.service';
import { EvolutionService } from '../evolution/evolution.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LeadOriginType, LeadStage, NotificationStatus } from '@prisma/client';

describe('LeadsService - CRM Comercial', () => {
  let service: LeadsService;
  let prisma: PrismaService;

  const mockPrismaService: any = {
    $transaction: jest.fn((cb) => cb(mockPrismaService)),
    lead: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    leadStageHistory: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockEvolutionService = {
    sendLeadNotification: jest.fn().mockResolvedValue({ success: true }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EvolutionService, useValue: mockEvolutionService },
      ],
    }).compile();

    service = module.get<LeadsService>(LeadsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('createOutboundLead', () => {
    it('deve registrar um lead outbound com status SENT, histórico inicial e sem disparar no grupo de inbound', async () => {
      const dto = {
        nome: 'Carlos Pizzaiolo',
        whatsapp: '11988887777',
        deliveryNome: 'Forno di Carlos',
        segmento: 'Pizzaria',
        cidade: 'Campinas - SP',
        dealValue: 2500,
      };

      mockPrismaService.lead.create.mockResolvedValue({
        id: 'outbound-1',
        ...dto,
        origemTipo: LeadOriginType.OUTBOUND,
        origem: 'PROSPECCAO_ATIVA',
        stage: LeadStage.NOVO,
        notificationStatus: NotificationStatus.SENT,
      });

      const result = await service.createOutboundLead(dto, 'user-admin-1');

      expect(prisma.lead.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            origemTipo: LeadOriginType.OUTBOUND,
            origem: 'PROSPECCAO_ATIVA',
            notificationStatus: NotificationStatus.SENT,
            sdrResponsibleId: 'user-admin-1',
            stageHistories: expect.objectContaining({
              create: expect.objectContaining({
                fromStage: null,
                toStage: LeadStage.NOVO,
                userId: 'user-admin-1',
              }),
            }),
          }),
        }),
      );
      expect(result.id).toBe('outbound-1');
      expect(mockEvolutionService.sendLeadNotification).not.toHaveBeenCalled();
    });
  });

  describe('updateCrmStage', () => {
    it('deve lançar BadRequestException se mover para PERDIDO sem lostReason', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue({ id: 'lead-1', stage: LeadStage.NOVO });

      await expect(
        service.updateCrmStage('lead-1', { stage: LeadStage.PERDIDO }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException se mover para REUNIAO_AGENDADA sem meetingDate', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue({ id: 'lead-1', stage: LeadStage.NOVO });

      await expect(
        service.updateCrmStage('lead-1', { stage: LeadStage.REUNIAO_AGENDADA }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve atualizar o estágio para FECHADO e criar registro de histórico', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue({ id: 'lead-1', stage: LeadStage.PROPOSTA_ENVIADA });
      mockPrismaService.lead.update.mockResolvedValue({
        id: 'lead-1',
        stage: LeadStage.FECHADO,
        dealValue: 3000,
      });

      const result = await service.updateCrmStage('lead-1', {
        stage: LeadStage.FECHADO,
        dealValue: 3000,
      }, 'user-admin-1');

      expect(result.stage).toBe(LeadStage.FECHADO);
      expect(mockPrismaService.leadStageHistory.create).toHaveBeenCalledWith({
        data: {
          leadId: 'lead-1',
          fromStage: LeadStage.PROPOSTA_ENVIADA,
          toStage: LeadStage.FECHADO,
          reason: null,
          userId: 'user-admin-1',
        },
      });
    });
  });

  describe('undoLastStage', () => {
    it('deve lançar NotFoundException se o lead não existir', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(null);

      await expect(service.undoLastStage('inexistente')).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException se não houver histórico recente disponível', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue({ id: 'lead-1', stage: LeadStage.NOVO });
      mockPrismaService.leadStageHistory.findFirst.mockResolvedValue(null);

      await expect(service.undoLastStage('lead-1')).rejects.toThrow(BadRequestException);
    });

    it('deve reverter o último histórico ativo e restaurar o estágio anterior do lead', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue({ id: 'lead-1', stage: LeadStage.NO_SHOW });
      mockPrismaService.leadStageHistory.findFirst.mockResolvedValue({
        id: 'hist-1',
        leadId: 'lead-1',
        fromStage: LeadStage.REUNIAO_AGENDADA,
        toStage: LeadStage.NO_SHOW,
        isReverted: false,
      });
      mockPrismaService.lead.update.mockResolvedValue({
        id: 'lead-1',
        stage: LeadStage.REUNIAO_AGENDADA,
      });

      const result = await service.undoLastStage('lead-1');

      expect(mockPrismaService.leadStageHistory.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'hist-1' },
          data: expect.objectContaining({ isReverted: true }),
        }),
      );
      expect(mockPrismaService.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lead-1' },
          data: expect.objectContaining({ stage: LeadStage.REUNIAO_AGENDADA }),
        }),
      );
      expect(result.restoredStage).toBe(LeadStage.REUNIAO_AGENDADA);
    });
  });

  describe('getCrmMetrics', () => {
    it('deve calcular corretamente Booking Rate, No-Show Rate e Win Rate baseados em eventos históricos', async () => {
      const mockLeads = [
        { id: '1', stage: LeadStage.NOVO, origemTipo: LeadOriginType.INBOUND, dealValue: null, meetingDate: null },
        { id: '2', stage: LeadStage.CONTATO_INICIADO, origemTipo: LeadOriginType.INBOUND, dealValue: null, meetingDate: null },
        { id: '3', stage: LeadStage.REUNIAO_AGENDADA, origemTipo: LeadOriginType.OUTBOUND, dealValue: 2000, meetingDate: new Date() },
        { id: '4', stage: LeadStage.NO_SHOW, origemTipo: LeadOriginType.OUTBOUND, dealValue: 2000, meetingDate: new Date() },
        { id: '5', stage: LeadStage.PROPOSTA_ENVIADA, origemTipo: LeadOriginType.INBOUND, dealValue: 2500, meetingDate: new Date() },
        { id: '6', stage: LeadStage.FECHADO, origemTipo: LeadOriginType.INBOUND, dealValue: 3000, meetingDate: new Date() },
      ];

      mockPrismaService.lead.findMany.mockResolvedValue(mockLeads);

      // Simula contagens de eventos históricos:
      // Agendamentos: 4 eventos
      // No-shows: 1 evento
      // Propostas: 1 evento
      // Fechados: 1 evento
      mockPrismaService.leadStageHistory.count
        .mockResolvedValueOnce(4) // REUNIAO_AGENDADA
        .mockResolvedValueOnce(1) // NO_SHOW
        .mockResolvedValueOnce(1) // PROPOSTA_ENVIADA
        .mockResolvedValueOnce(1); // FECHADO

      const metrics = await service.getCrmMetrics();

      expect(metrics.totalLeads).toBe(6);
      expect(metrics.totalInbound).toBe(4);
      expect(metrics.totalOutbound).toBe(2);
      expect(metrics.agendadosCount).toBe(4);
      expect(metrics.noShowCount).toBe(1);
      expect(metrics.fechadosCount).toBe(1);

      // Agendados: 4 de 6 = 66.7%
      expect(metrics.bookingRate).toBe(66.7);

      // No-Show: 1 de 4 agendados = 25.0%
      expect(metrics.noShowRate).toBe(25.0);

      // Reuniões Realizadas: 1 proposta + 1 fechado = 2 reuniões. 1 fechado de 2 = 50.0%
      expect(metrics.winRate).toBe(50.0);

      // Pipeline Ativo: lead 3 (2000) + lead 5 (2500) = 4500
      expect(metrics.totalPipelineValue).toBe(4500);

      // Fechado: lead 6 (3000)
      expect(metrics.closedRevenueValue).toBe(3000);
    });
  });
});
