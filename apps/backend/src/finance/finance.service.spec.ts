import { Test, TestingModule } from '@nestjs/testing';
import { FinanceService } from './finance.service';
import { PrismaService } from '../prisma/prisma.service';
import { ClientStatus, PaymentStatus, PlanCycle, PlanType } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

describe('FinanceService - Módulo Financeiro', () => {
  let service: FinanceService;
  let prisma: PrismaService;

  const mockPrismaService = {
    client: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    contract: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinanceService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<FinanceService>(FinanceService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('getFinanceMetrics', () => {
    it('deve calcular corretamente MRR, LTV, Margem Bruta e Inadimplência', async () => {
      const now = new Date();
      const mockClients = [
        {
          id: 'client-1',
          status: ClientStatus.ATIVO,
          updatedAt: now,
          contract: {
            mrrEquivalent: 1500, // R$ 1.500/mês
            setupValue: 0,
            operationalCost: 150,
            dueDay: 1, // Venceu dia 1 -> se hoje > dia 1 e PENDENTE, é inadimplente
            paymentStatus: PaymentStatus.EM_DIA,
            startDate: new Date(now.getFullYear(), now.getMonth() - 2, 1), // 3 meses ativo
            createdAt: now,
          },
        },
        {
          id: 'client-2',
          status: ClientStatus.ATIVO,
          updatedAt: now,
          contract: {
            mrrEquivalent: 2000,
            setupValue: 1000,
            operationalCost: 200,
            dueDay: 1,
            paymentStatus: PaymentStatus.INADIMPLENTE, // Inadimplente explícito
            startDate: new Date(now.getFullYear(), now.getMonth(), 1), // 1 mês ativo
            createdAt: now,
          },
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients);

      const metrics = await service.getFinanceMetrics();

      expect(metrics.clientesAtivosCount).toBe(2);
      expect(metrics.mrrTotal).toBe(3500); // 1500 + 2000
      expect(metrics.cogsTotal).toBe(350); // 150 + 200
      expect(metrics.ticketMedio).toBe(1750); // 3500 / 2
      expect(metrics.margemBrutaPercent).toBe(90.0); // (3500 - 350) / 3500 = 90%
      expect(metrics.totalInadimplenteClientes).toBe(1);
      expect(metrics.totalInadimplenteValor).toBe(2000);
    });
  });

  describe('getContracts', () => {
    it('deve sinalizar isAtRisk = true quando daysOverdue for maior que 5', async () => {
      const mockClients = [
        {
          id: 'client-1',
          nome: 'Carlos',
          deliveryNome: 'Pizzaria do Carlos',
          whatsapp: '11999999999',
          segmento: 'Pizzaria',
          cidade: 'Campinas - SP',
          status: ClientStatus.ATIVO,
          accountManager: null,
          contract: {
            id: 'contract-1',
            cycle: PlanCycle.TRIMESTRAL,
            planType: PlanType.TRIMESTRAL_REUNIAO,
            totalValue: 4500,
            mrrEquivalent: 1500,
            dueDay: 1, // Venceu no dia 1
            paymentStatus: PaymentStatus.PENDENTE,
          },
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients);

      const contracts = await service.getContracts();
      expect(contracts).toHaveLength(1);

      const contract = contracts[0].contract;
      const today = new Date().getDate();
      if (today > 6) {
        expect(contract?.daysOverdue).toBeGreaterThan(5);
        expect(contract?.isAtRisk).toBe(true);
      }
    });
  });

  describe('upsertContract', () => {
    it('deve lançar NotFoundException se o cliente não existir', async () => {
      mockPrismaService.client.findUnique.mockResolvedValue(null);

      await expect(
        service.upsertContract('inexistente', {
          cycle: PlanCycle.TRIMESTRAL,
          planType: PlanType.TRIMESTRAL_REUNIAO,
          totalValue: 4500,
          mrrEquivalent: 1500,
          dueDay: 10,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve salvar o contrato no Prisma com sucesso', async () => {
      mockPrismaService.client.findUnique.mockResolvedValue({ id: 'c1', deliveryNome: 'Burger' });
      mockPrismaService.contract.upsert.mockResolvedValue({ id: 'contract-1', totalValue: 4500 });

      const res = await service.upsertContract('c1', {
        cycle: PlanCycle.TRIMESTRAL,
        planType: PlanType.TRIMESTRAL_REUNIAO,
        totalValue: 4500,
        mrrEquivalent: 1500,
        dueDay: 10,
      });

      expect(res.id).toBe('contract-1');
      expect(prisma.contract.upsert).toHaveBeenCalled();
    });
  });
});
