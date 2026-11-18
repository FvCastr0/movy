import { Test, TestingModule } from '@nestjs/testing';
import { OnboardingOpsService } from './onboarding-ops.service';
import { PrismaService } from '../prisma/prisma.service';
import { OnboardingStage, ClientStatus } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('OnboardingOpsService - Onboarding & Performance', () => {
  let service: OnboardingOpsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    client: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    clientRevenueReport: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingOpsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<OnboardingOpsService>(OnboardingOpsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('getOnboardingPipeline', () => {
    it('deve marcar isDelayed = true para clientes com mais de 48h na mesma etapa', async () => {
      const now = Date.now();
      const mockClients = [
        {
          id: 'c1',
          deliveryNome: 'Pizzaria Atrasada',
          onboardingStage: OnboardingStage.ACESSOS_LIBERADOS,
          onboardingStageUpdatedAt: new Date(now - 55 * 60 * 60 * 1000), // 55h atrás
        },
        {
          id: 'c2',
          deliveryNome: 'Burger Pontual',
          onboardingStage: OnboardingStage.BRIEFING_PREENCHIDO,
          onboardingStageUpdatedAt: new Date(now - 12 * 60 * 60 * 1000), // 12h atrás
        },
        {
          id: 'c3',
          deliveryNome: 'Sushi Concluído',
          onboardingStage: OnboardingStage.CONCLUIDO,
          onboardingStageUpdatedAt: new Date(now - 70 * 60 * 60 * 1000), // 70h, mas CONCLUIDO
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients);

      const pipeline = await service.getOnboardingPipeline();

      expect(pipeline[0].isDelayed).toBe(true);
      expect(pipeline[0].hoursInStage).toBeGreaterThanOrEqual(55);

      expect(pipeline[1].isDelayed).toBe(false);
      expect(pipeline[1].hoursInStage).toBe(12);

      // Concluído nunca deve ser marcado como delayed
      expect(pipeline[2].isDelayed).toBe(false);
    });
  });

  describe('getRiskStatus', () => {
    it('deve detectar spike de CPA superior a 30% e saldo insuficiente', async () => {
      const today = new Date();
      const metrics = [
        // Últimos 3 dias com CPA alto (R$ 15,00)
        { date: today, spend: 60, conversas: 4, cpa: 15.0, balance: 80 },
        { date: new Date(today.getTime() - 86400000), spend: 60, conversas: 4, cpa: 15.0, balance: 140 },
        { date: new Date(today.getTime() - 172800000), spend: 60, conversas: 4, cpa: 15.0, balance: 200 },
        // Dias anteriores com CPA normal (R$ 8,00)
        { date: new Date(today.getTime() - 259200000), spend: 60, conversas: 7, cpa: 8.57, balance: 260 },
        { date: new Date(today.getTime() - 345600000), spend: 60, conversas: 8, cpa: 7.5, balance: 320 },
        { date: new Date(today.getTime() - 432000000), spend: 60, conversas: 8, cpa: 7.5, balance: 380 },
        { date: new Date(today.getTime() - 518400000), spend: 60, conversas: 8, cpa: 7.5, balance: 440 },
      ];

      mockPrismaService.client.findUnique.mockResolvedValue({
        id: 'c1',
        deliveryNome: 'Pizzaria',
        contract: { mediaBudget: 1500 },
        adAccountMetrics: metrics,
      });

      const risk = await service.getRiskStatus('c1');

      expect(risk.isCpaSpike).toBe(true);
      expect(risk.cpaDiffPercent).toBeGreaterThanOrEqual(30.0);
      expect(risk.isLowBalance).toBe(true); // Saldo de R$ 80 é menor que weekendSpendRequired (~150)
    });
  });

  describe('parseRevenueCsv', () => {
    it('deve extrair faturamento e pedidos de um CSV formatado em moeda brasileira', async () => {
      mockPrismaService.client.findUnique.mockResolvedValue({ id: 'c1', deliveryNome: 'Burger' });
      mockPrismaService.clientRevenueReport.create.mockImplementation((args) => Promise.resolve({ id: 'r1', ...args.data }));

      const csvData = `Data;Pedido;Valor Total
2026-11-10;1001;R$ 85,50
2026-11-10;1002;R$ 114,00
2026-11-11;1003;R$ 60,50`;

      const result = await service.parseRevenueCsv('c1', {
        csvData,
        filename: 'vendas_semana.csv',
      });

      expect(result.ordersCount).toBe(3);
      expect(result.grossRevenue).toBe(260.0); // 85.50 + 114.00 + 60.50 = 260.00
      expect(result.ticketMedioPedidos).toBe(86.67);
      expect(prisma.clientRevenueReport.create).toHaveBeenCalled();
    });

    it('deve lançar BadRequestException se o CSV tiver menos de 2 linhas', async () => {
      mockPrismaService.client.findUnique.mockResolvedValue({ id: 'c1' });

      await expect(
        service.parseRevenueCsv('c1', { csvData: 'Cabecalho' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
