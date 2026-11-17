import { Test, TestingModule } from '@nestjs/testing';
import { LeadsService } from './leads.service';
import { PrismaService } from '../prisma/prisma.service';
import { EvolutionService } from '../evolution/evolution.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LeadOriginType, LeadStage, NotificationStatus } from '@prisma/client';

describe('LeadsService - CRM Comercial', () => {
  let service: LeadsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    lead: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
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
    it('deve registrar um lead outbound com status SENT e sem disparar no grupo de inbound', async () => {
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

    it('deve atualizar o estágio para FECHADO com sucesso', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue({ id: 'lead-1', stage: LeadStage.PROPOSTA_ENVIADA });
      mockPrismaService.lead.update.mockResolvedValue({
        id: 'lead-1',
        stage: LeadStage.FECHADO,
        dealValue: 3000,
      });

      const result = await service.updateCrmStage('lead-1', {
        stage: LeadStage.FECHADO,
        dealValue: 3000,
      });

      expect(result.stage).toBe(LeadStage.FECHADO);
      expect(prisma.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lead-1' },
          data: expect.objectContaining({
            stage: LeadStage.FECHADO,
            dealValue: 3000,
          }),
        }),
      );
    });
  });

  describe('getCrmMetrics', () => {
    it('deve calcular corretamente Booking Rate, No-Show Rate e Win Rate', async () => {
      const mockLeads = [
        { id: '1', stage: LeadStage.NOVO, origemTipo: LeadOriginType.INBOUND, dealValue: null, meetingDate: null },
        { id: '2', stage: LeadStage.CONTATO_INICIADO, origemTipo: LeadOriginType.INBOUND, dealValue: null, meetingDate: null },
        { id: '3', stage: LeadStage.REUNIAO_AGENDADA, origemTipo: LeadOriginType.OUTBOUND, dealValue: 2000, meetingDate: new Date() },
        { id: '4', stage: LeadStage.NO_SHOW, origemTipo: LeadOriginType.OUTBOUND, dealValue: 2000, meetingDate: new Date() },
        { id: '5', stage: LeadStage.PROPOSTA_ENVIADA, origemTipo: LeadOriginType.INBOUND, dealValue: 2500, meetingDate: new Date() },
        { id: '6', stage: LeadStage.FECHADO, origemTipo: LeadOriginType.INBOUND, dealValue: 3000, meetingDate: new Date() },
      ];

      mockPrismaService.lead.findMany.mockResolvedValue(mockLeads);

      const metrics = await service.getCrmMetrics();

      expect(metrics.totalLeads).toBe(6);
      expect(metrics.totalInbound).toBe(4);
      expect(metrics.totalOutbound).toBe(2);

      // Agendados: leads 3, 4, 5, 6 (4 leads de 6 total = 66.7%)
      expect(metrics.bookingRate).toBe(66.7);

      // No-Show: 1 no-show de 4 agendados (25.0%)
      expect(metrics.noShowRate).toBe(25.0);

      // Reuniões Realizadas: leads 5 e 6 (2 reuniões) -> 1 fechado (50.0%)
      expect(metrics.winRate).toBe(50.0);

      // Pipeline Ativo: lead 3 (2000) + lead 5 (2500) = 4500
      expect(metrics.totalPipelineValue).toBe(4500);

      // Fechado: lead 6 (3000)
      expect(metrics.closedRevenueValue).toBe(3000);
    });
  });
});
