import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { FinanceMetricsResponseDto } from './dto/finance-metrics-response.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import {
  MonthFinancialStatement,
  MonthlyClosingSummary,
} from './dto/monthly-closing-response.dto';
import { ClientStatus, PaymentStatus, ExpenseCategory, PlanCycle } from '@prisma/client';

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getFinanceMetrics(): Promise<FinanceMetricsResponseDto> {
    const clients = await this.prisma.client.findMany({
      include: { contract: true },
    });

    const activeClients = clients.filter((c) => c.status === ClientStatus.ATIVO);
    const clientesAtivosCount = activeClients.length;

    let mrrTotal = 0;
    let cogsTotal = 0;
    let totalInadimplenteValor = 0;
    let totalInadimplenteClientes = 0;
    let totalSetupMes = 0;

    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let totalLtvSum = 0;

    for (const client of clients) {
      const contract = client.contract;
      if (!contract) continue;

      // Cálculo de LTV individual do cliente (composto por setups + meses ativos pagos)
      const startDate = new Date(contract.startDate);
      const monthsActive = Math.max(
        1,
        (currentYear - startDate.getFullYear()) * 12 + (currentMonth - startDate.getMonth()) + 1,
      );
      const clientLtv = (contract.setupValue || 0) + contract.mrrEquivalent * monthsActive;
      totalLtvSum += clientLtv;

      if (client.status === ClientStatus.ATIVO) {
        mrrTotal += contract.mrrEquivalent;
        cogsTotal += contract.operationalCost || 0;

        // Se o contrato foi criado neste mês, considera o setup
        const contractCreated = new Date(contract.createdAt);
        if (
          contractCreated.getMonth() === currentMonth &&
          contractCreated.getFullYear() === currentYear
        ) {
          totalSetupMes += contract.setupValue || 0;
        }

        // Análise de Inadimplência
        const isPastDue = currentDay > contract.dueDay;
        const isInadimplente =
          contract.paymentStatus === PaymentStatus.INADIMPLENTE ||
          (contract.paymentStatus === PaymentStatus.PENDENTE && isPastDue);

        if (isInadimplente) {
          totalInadimplenteClientes++;
          totalInadimplenteValor += contract.mrrEquivalent;
        }
      }
    }

    const ticketMedio = clientesAtivosCount > 0 ? Math.round(mrrTotal / clientesAtivosCount) : 0;
    const margemBrutaPercent =
      mrrTotal > 0 ? Number((((mrrTotal - cogsTotal) / mrrTotal) * 100).toFixed(1)) : 0;
    const ltvMedio = clients.length > 0 ? Math.round(totalLtvSum / clients.length) : 0;
    const receitaMesAtual = mrrTotal - totalInadimplenteValor + totalSetupMes;

    // Churn Rate dos últimos 30 dias
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const canceledLastMonth = clients.filter(
      (c) => c.status === ClientStatus.CANCELADO && c.updatedAt >= thirtyDaysAgo,
    ).length;
    const totalBase = clientesAtivosCount + canceledLastMonth;
    const churnRatePercent =
      totalBase > 0 ? Number(((canceledLastMonth / totalBase) * 100).toFixed(1)) : 0;

    return {
      mrrTotal,
      receitaMesAtual,
      ticketMedio,
      clientesAtivosCount,
      cogsTotal,
      margemBrutaPercent,
      ltvMedio,
      totalInadimplenteValor,
      totalInadimplenteClientes,
      churnRatePercent,
    };
  }

  async getContracts(paymentStatus?: PaymentStatus, search?: string) {
    const where: any = {};

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { nome: { contains: term, mode: 'insensitive' } },
        { deliveryNome: { contains: term, mode: 'insensitive' } },
        { cidade: { contains: term, mode: 'insensitive' } },
      ];
    }

    const clients = await this.prisma.client.findMany({
      where,
      include: {
        contract: true,
        accountManager: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { status: 'asc' }, // ATIVOS primeiro
    });

    const today = new Date();
    const currentDay = today.getDate();

    const result = clients.map((client) => {
      const contract = client.contract;
      let daysOverdue = 0;
      let isAtRisk = false;

      if (contract && contract.paymentStatus !== PaymentStatus.EM_DIA) {
        if (currentDay > contract.dueDay) {
          daysOverdue = currentDay - contract.dueDay;
          if (daysOverdue > 5) {
            isAtRisk = true; // Gatilho de alerta para pausa de anúncios
          }
        }
      }

      return {
        client: {
          id: client.id,
          nome: client.nome,
          deliveryNome: client.deliveryNome,
          whatsapp: client.whatsapp,
          segmento: client.segmento,
          cidade: client.cidade,
          status: client.status,
          accountManager: client.accountManager,
        },
        contract: contract
          ? {
              ...contract,
              daysOverdue,
              isAtRisk,
            }
          : null,
      };
    });

    if (paymentStatus) {
      return result.filter((item) => item.contract?.paymentStatus === paymentStatus);
    }

    return result;
  }

  async upsertContract(clientId: string, dto: CreateContractDto) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      throw new NotFoundException(`Cliente com ID ${clientId} não foi encontrado.`);
    }

    this.logger.log(`Atualizando contrato do cliente: ${client.deliveryNome} (${clientId})`);

    return this.prisma.contract.upsert({
      where: { clientId },
      create: {
        clientId,
        cycle: dto.cycle,
        planType: dto.planType,
        totalValue: dto.totalValue,
        mrrEquivalent: dto.mrrEquivalent,
        setupValue: dto.setupValue || 0,
        dueDay: dto.dueDay,
        paymentStatus: dto.paymentStatus || PaymentStatus.EM_DIA,
        mediaBudget: dto.mediaBudget || 1500,
        operationalCost: dto.operationalCost || 150,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        churnReason: dto.churnReason || null,
        notes: dto.notes || null,
      },
      update: {
        cycle: dto.cycle,
        planType: dto.planType,
        totalValue: dto.totalValue,
        mrrEquivalent: dto.mrrEquivalent,
        setupValue: dto.setupValue !== undefined ? dto.setupValue : undefined,
        dueDay: dto.dueDay,
        paymentStatus: dto.paymentStatus !== undefined ? dto.paymentStatus : undefined,
        mediaBudget: dto.mediaBudget !== undefined ? dto.mediaBudget : undefined,
        operationalCost: dto.operationalCost !== undefined ? dto.operationalCost : undefined,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        churnReason: dto.churnReason !== undefined ? dto.churnReason : undefined,
        notes: dto.notes !== undefined ? dto.notes : undefined,
      },
    });
  }

  async updatePaymentStatus(clientId: string, dto: UpdatePaymentStatusDto) {
    const contract = await this.prisma.contract.findUnique({ where: { clientId } });
    if (!contract) {
      throw new NotFoundException(`Nenhum contrato encontrado para o cliente ${clientId}.`);
    }

    return this.prisma.contract.update({
      where: { clientId },
      data: {
        paymentStatus: dto.paymentStatus,
        notes: dto.notes !== undefined ? dto.notes : contract.notes,
      },
    });
  }

  // ==========================================
  // GESTÃO DE DESPESAS DA AGÊNCIA (EXPENSES)
  // ==========================================

  async createExpense(dto: CreateExpenseDto) {
    this.logger.log(`Criando despesa: ${dto.description} - R$ ${dto.amount} (${dto.category})`);
    return this.prisma.expense.create({
      data: {
        description: dto.description,
        category: dto.category,
        amount: dto.amount,
        dueDate: new Date(dto.dueDate),
        isRecurring: dto.isRecurring || false,
        notes: dto.notes || null,
      },
    });
  }

  async getExpenses(category?: ExpenseCategory, isActive: boolean = true) {
    const where: any = { isActive };
    if (category) {
      where.category = category;
    }

    return this.prisma.expense.findMany({
      where,
      orderBy: [{ dueDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async updateExpense(id: string, dto: UpdateExpenseDto) {
    const existing = await this.prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Despesa com ID ${id} não foi encontrada.`);
    }

    return this.prisma.expense.update({
      where: { id },
      data: {
        description: dto.description !== undefined ? dto.description : existing.description,
        category: dto.category !== undefined ? dto.category : existing.category,
        amount: dto.amount !== undefined ? dto.amount : existing.amount,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : existing.dueDate,
        isRecurring: dto.isRecurring !== undefined ? dto.isRecurring : existing.isRecurring,
        isActive: dto.isActive !== undefined ? dto.isActive : existing.isActive,
        notes: dto.notes !== undefined ? dto.notes : existing.notes,
      },
    });
  }

  async deleteExpense(id: string) {
    const existing = await this.prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Despesa com ID ${id} não foi encontrada.`);
    }

    // Soft delete para preservar histórico financeiro
    return this.prisma.expense.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ==========================================
  // MOTOR DE FECHAMENTO MENSAL E DRE (MoM)
  // ==========================================

  async getMonthlyClosings(monthsCount: number = 6): Promise<MonthlyClosingSummary> {
    const count = Math.min(Math.max(monthsCount, 1), 24);
    const today = new Date();

    // 1. Carregar contratos e clientes
    const clients = await this.prisma.client.findMany({
      include: { contract: true },
    });

    // 2. Carregar despesas ativas
    const allExpenses = await this.prisma.expense.findMany({
      where: { isActive: true },
    });

    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const periods: MonthFinancialStatement[] = [];

    let sumRevComp = 0;
    let sumRevCash = 0;
    let sumExpTotal = 0;
    let sumProfitComp = 0;
    let sumProfitCash = 0;

    // Gerar da data mais antiga até o mês atual
    for (let i = count - 1; i >= 0; i--) {
      const targetDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const targetYear = targetDate.getFullYear();
      const targetMonth = targetDate.getMonth();

      const monthStart = new Date(targetYear, targetMonth, 1, 0, 0, 0);
      const monthEnd = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);
      const monthKey = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;
      const label = `${monthNames[targetMonth]} ${targetYear}`;

      let mrrRecognized = 0;
      let cashInflow = 0;
      let cogsClients = 0;

      // Calcular entradas dos clientes
      for (const client of clients) {
        const contract = client.contract;
        if (!contract) continue;

        const contractStart = new Date(contract.startDate);
        const contractEnd = contract.endDate ? new Date(contract.endDate) : null;

        // Se o contrato já estava vigente neste mês
        if (contractStart <= monthEnd && (!contractEnd || contractEnd >= monthStart)) {
          // MRR por competência
          mrrRecognized += contract.mrrEquivalent;
          cogsClients += contract.operationalCost || 0;

          // Fluxo de caixa
          const monthsFromStart =
            (targetYear - contractStart.getFullYear()) * 12 + (targetMonth - contractStart.getMonth());

          if (monthsFromStart >= 0) {
            if (contract.cycle === PlanCycle.MENSAL) {
              cashInflow += contract.totalValue;
            } else if (contract.cycle === PlanCycle.TRIMESTRAL) {
              // Entrada do valor cheio no início e a cada renovação trimestral
              if (monthsFromStart % 3 === 0) {
                cashInflow += contract.totalValue;
              }
            }

            // Setup cai no primeiro mês do contrato
            if (monthsFromStart === 0 && contract.setupValue) {
              cashInflow += contract.setupValue;
            }
          }
        }
      }

      // Calcular despesas da agência
      const expenses = {
        team: 0,
        tools: 0,
        marketing: 0,
        others: 0,
        total: 0,
      };

      for (const exp of allExpenses) {
        const expDate = new Date(exp.dueDate);
        let applies = false;

        if (exp.isRecurring) {
          // Despesa recorrente vale a partir do mês de início
          if (expDate <= monthEnd) {
            applies = true;
          }
        } else {
          // Despesa pontual vale apenas no mês correspondente
          if (expDate >= monthStart && expDate <= monthEnd) {
            applies = true;
          }
        }

        if (applies) {
          switch (exp.category) {
            case ExpenseCategory.EQUIPE:
              expenses.team += exp.amount;
              break;
            case ExpenseCategory.FERRAMENTAS_SAAS:
              expenses.tools += exp.amount;
              break;
            case ExpenseCategory.MARKETING_PROPRIO:
              expenses.marketing += exp.amount;
              break;
            case ExpenseCategory.OUTROS:
            default:
              expenses.others += exp.amount;
              break;
          }
        }
      }

      expenses.total = expenses.team + expenses.tools + expenses.marketing + expenses.others;

      const netProfitCompetence = mrrRecognized - cogsClients - expenses.total;
      const netProfitCash = cashInflow - cogsClients - expenses.total;
      const netMarginPercent =
        mrrRecognized > 0
          ? Number(((netProfitCompetence / mrrRecognized) * 100).toFixed(1))
          : 0;

      periods.push({
        monthKey,
        label,
        revenue: {
          mrrRecognized,
          cashInflow,
        },
        cogsClients,
        expenses,
        netProfitCompetence,
        netProfitCash,
        netMarginPercent,
      });

      sumRevComp += mrrRecognized;
      sumRevCash += cashInflow;
      sumExpTotal += expenses.total;
      sumProfitComp += netProfitCompetence;
      sumProfitCash += netProfitCash;
    }

    const averageMarginPercent =
      sumRevComp > 0 ? Number(((sumProfitComp / sumRevComp) * 100).toFixed(1)) : 0;

    return {
      periods,
      totals: {
        totalRevenueCompetence: sumRevComp,
        totalRevenueCash: sumRevCash,
        totalExpenses: sumExpTotal,
        totalNetProfitCompetence: sumProfitComp,
        totalNetProfitCash: sumProfitCash,
        averageMarginPercent,
      },
    };
  }
}
