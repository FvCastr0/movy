import { Test, TestingModule } from '@nestjs/testing';
import { FinanceService } from './finance.service';
import { PrismaService } from '../prisma/prisma.service';
import { ClientStatus, PaymentStatus, PlanCycle, PlanType, ExpenseCategory } from '@prisma/client';
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
    expense: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
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

  describe('Expenses (Despesas da Agência)', () => {
    it('deve criar uma nova despesa com sucesso', async () => {
      const dto = {
        description: 'SDR Prestador',
        category: ExpenseCategory.EQUIPE,
        amount: 2500,
        dueDate: '2026-11-05',
        isRecurring: true,
      };

      mockPrismaService.expense.create.mockResolvedValue({
        id: 'exp-1',
        ...dto,
        dueDate: new Date(dto.dueDate),
        isActive: true,
      });

      const res = await service.createExpense(dto);
      expect(res.id).toBe('exp-1');
      expect(prisma.expense.create).toHaveBeenCalled();
    });

    it('deve realizar soft delete desativando a despesa (isActive: false)', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue({ id: 'exp-1', isActive: true });
      mockPrismaService.expense.update.mockResolvedValue({ id: 'exp-1', isActive: false });

      const res = await service.deleteExpense('exp-1');
      expect(res.isActive).toBe(false);
      expect(prisma.expense.update).toHaveBeenCalledWith({
        where: { id: 'exp-1' },
        data: { isActive: false },
      });
    });
  });

  describe('getMonthlyClosings (Fechamento Mensal MoM)', () => {
    it('deve calcular a DRE dos últimos 6 meses com receitas, despesas e lucro líquido', async () => {
      const now = new Date();
      const mockClients = [
        {
          id: 'c1',
          contract: {
            mrrEquivalent: 2000,
            totalValue: 2000,
            setupValue: 500,
            cycle: PlanCycle.MENSAL,
            operationalCost: 150,
            startDate: new Date(now.getFullYear(), now.getMonth() - 5, 1),
            endDate: null,
          },
        },
      ];

      const mockExpenses = [
        {
          id: 'e1',
          description: 'Salário SDR',
          category: ExpenseCategory.EQUIPE,
          amount: 1000,
          dueDate: new Date(now.getFullYear(), now.getMonth() - 5, 5),
          isRecurring: true,
          isActive: true,
        },
        {
          id: 'e2',
          description: 'CRM SaaS',
          category: ExpenseCategory.FERRAMENTAS_SAAS,
          amount: 200,
          dueDate: new Date(now.getFullYear(), now.getMonth() - 5, 10),
          isRecurring: true,
          isActive: true,
        },
      ];

      mockPrismaService.client.findMany.mockResolvedValue(mockClients);
      mockPrismaService.expense.findMany.mockResolvedValue(mockExpenses);

      const result = await service.getMonthlyClosings(6);

      expect(result.periods).toHaveLength(6);
      const currentPeriod = result.periods[result.periods.length - 1];

      // Verificação do mês atual
      expect(currentPeriod.revenue.mrrRecognized).toBe(2000);
      expect(currentPeriod.cogsClients).toBe(150);
      expect(currentPeriod.expenses.team).toBe(1000);
      expect(currentPeriod.expenses.tools).toBe(200);
      expect(currentPeriod.expenses.total).toBe(1200);

      // Lucro Líquido = 2000 (MRR) - 150 (COGS) - 1200 (Despesas) = 650
      expect(currentPeriod.netProfitCompetence).toBe(650);
      // Margem Líquida = (650 / 2000) * 100 = 32.5%
      expect(currentPeriod.netMarginPercent).toBe(32.5);

      expect(result.totals.totalRevenueCompetence).toBe(12000); // 2000 * 6
      expect(result.totals.totalExpenses).toBe(7200); // 1200 * 6
    });
  });
});
