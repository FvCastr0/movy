import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { FinanceMetricsResponseDto } from './dto/finance-metrics-response.dto';
import { ClientStatus, PaymentStatus } from '@prisma/client';

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
}
