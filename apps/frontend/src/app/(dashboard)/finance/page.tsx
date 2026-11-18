'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Client,
  Contract,
  FinanceMetrics,
  PaymentStatus,
  Expense,
  MonthlyClosingSummary,
} from '@/types';
import { FinanceKpiCards } from '@/components/finance/finance-kpi-cards';
import { BillingTable } from '@/components/finance/billing-table';
import { ContractModal } from '@/components/finance/contract-modal';
import { ExpenseListTable } from '@/components/finance/expense-list-table';
import { ExpenseManagerModal } from '@/components/finance/expense-manager-modal';
import { MonthlyComparisonChart } from '@/components/finance/monthly-comparison-chart';
import { DreStatementTable } from '@/components/finance/dre-statement-table';
import {
  RefreshCw,
  Search,
  AlertCircle,
  Sparkles,
  ShieldAlert,
  FileSpreadsheet,
  Receipt,
  Users2,
} from 'lucide-react';

interface BillingRowData {
  client: Client;
  contract: Contract | null;
}

export default function FinanceDashboardPage() {
  const [metrics, setMetrics] = useState<FinanceMetrics | null>(null);
  const [items, setItems] = useState<BillingRowData[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [monthlyClosings, setMonthlyClosings] = useState<MonthlyClosingSummary | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Aba central: Despesas Operacionais (Default) vs Contratos vs DRE
  const [activeTab, setActiveTab] = useState<'EXPENSES' | 'CONTRACTS' | 'DRE'>('EXPENSES');

  // Filtros de Contratos
  const [statusFilter, setStatusFilter] = useState<'ALL' | PaymentStatus | 'RISK'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Período do Fechamento Mensal (default 6 meses)
  const [closingMonths, setClosingMonths] = useState<number>(6);

  // Modais
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);

  const fetchData = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setIsLoading(true);
      setIsRefreshing(true);
      setErrorMessage(null);

      try {
        const queryParams = new URLSearchParams();
        if (statusFilter !== 'ALL' && statusFilter !== 'RISK') {
          queryParams.append('paymentStatus', statusFilter);
        }
        if (searchQuery.trim()) {
          queryParams.append('search', searchQuery.trim());
        }

        const [metricsRes, contractsRes, expensesRes, closingsRes] = await Promise.all([
          api.get<FinanceMetrics>('/finance/metrics'),
          api.get<BillingRowData[]>(`/finance/contracts?${queryParams.toString()}`),
          api.get<Expense[]>('/finance/expenses'),
          api.get<MonthlyClosingSummary>(`/finance/monthly-closings?months=${closingMonths}`),
        ]);

        setMetrics(metricsRes.data);
        setExpenses(expensesRes.data);
        setMonthlyClosings(closingsRes.data);

        if (statusFilter === 'RISK') {
          setItems(contractsRes.data.filter((item) => item.contract?.isAtRisk));
        } else {
          setItems(contractsRes.data);
        }
      } catch (err: any) {
        setErrorMessage(
          err.response?.data?.message || 'Falha ao sincronizar dados financeiros com o servidor.'
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [statusFilter, searchQuery, closingMonths]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdatePaymentStatus = async (clientId: string, newStatus: PaymentStatus) => {
    setItems((prev) =>
      prev.map((item) =>
        item.client.id === clientId
          ? {
              ...item,
              contract: item.contract
                ? {
                    ...item.contract,
                    paymentStatus: newStatus,
                    isAtRisk: newStatus === 'EM_DIA' ? false : item.contract.isAtRisk,
                  }
                : null,
            }
          : item
      )
    );

    try {
      await api.patch(`/finance/clients/${clientId}/payment-status`, {
        paymentStatus: newStatus,
      });
      fetchData(true);
    } catch (err: any) {
      alert('Falha ao atualizar status de pagamento no servidor.');
      fetchData(true);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await api.delete(`/finance/expenses/${id}`);
      fetchData(true);
    } catch (err: any) {
      alert('Falha ao excluir despesa.');
    }
  };

  const handleOpenEditContract = (client: Client) => {
    setSelectedClient(client);
    setIsContractModalOpen(true);
  };

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 py-2 sm:px-6 space-y-6">
        {/* Banner de Título & Ações */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-text-primary">
                Gestão Financeira & Fechamento da Agência
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                <Sparkles className="h-3 w-3" />
                DRE & Contratos
              </span>
            </div>
            <p className="mt-0.5 text-xs text-text-muted">
              Controle unificado de entradas (contratos e MRR), saídas operacionais (equipe e softwares) e DRE comparativo
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => fetchData(true)}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-surface-card px-3 py-2 text-xs font-semibold text-text-muted hover:bg-white/5 hover:text-text-primary transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
          </div>
        </div>

        {/* Mensagem de Erro (se houver) */}
        {errorMessage && (
          <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-200">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Cards de KPIs Financeiros */}
        <FinanceKpiCards metrics={metrics} isLoading={isLoading} />

        {/* ======================================================== */}
        {/* SEÇÃO PRINCIPAL: NAVBAR DE 3 ABAS DEDICADAS              */}
        {/* ======================================================== */}
        <div className="space-y-4">
          {/* Navegação entre Módulos Centrais */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('EXPENSES')}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
                  activeTab === 'EXPENSES'
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-text-muted hover:bg-white/5 hover:text-text-primary'
                }`}
              >
                <Receipt className="h-4 w-4" />
                <span>Despesas Operacionais ({expenses.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('CONTRACTS')}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
                  activeTab === 'CONTRACTS'
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-text-muted hover:bg-white/5 hover:text-text-primary'
                }`}
              >
                <Users2 className="h-4 w-4" />
                <span>Contratos & Clientes ({items.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('DRE')}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
                  activeTab === 'DRE'
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-text-muted hover:bg-white/5 hover:text-text-primary'
                }`}
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Demonstrativo do Resultado (DRE)</span>
              </button>
            </div>
          </div>

          {/* Conteúdo da Aba 1: Despesas Operacionais (Default) */}
          {activeTab === 'EXPENSES' && (
            <ExpenseListTable
              expenses={expenses}
              isLoading={isLoading}
              onOpenCreateModal={() => {
                setExpenseToEdit(null);
                setIsExpenseModalOpen(true);
              }}
              onOpenEditModal={(exp) => {
                setExpenseToEdit(exp);
                setIsExpenseModalOpen(true);
              }}
              onDeleteExpense={handleDeleteExpense}
            />
          )}

          {/* Conteúdo da Aba 2: Contratos & Clientes */}
          {activeTab === 'CONTRACTS' && (
            <div className="space-y-4">
              {/* Filtros e Busca de Contratos */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-white/10 bg-surface-card p-3">
                <div className="flex flex-wrap items-center rounded-lg border border-white/10 bg-surface-canvas p-1">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ALL')}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                      statusFilter === 'ALL'
                        ? 'bg-white/10 text-text-primary shadow-sm'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    Todos ({items.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter('EM_DIA')}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                      statusFilter === 'EM_DIA'
                        ? 'bg-emerald-500/20 text-emerald-400 shadow-sm border border-emerald-500/30'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    Em Dia
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter('PENDENTE')}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                      statusFilter === 'PENDENTE'
                        ? 'bg-amber-500/20 text-amber-400 shadow-sm border border-amber-500/30'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    Pendente
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter('INADIMPLENTE')}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                      statusFilter === 'INADIMPLENTE'
                        ? 'bg-rose-500/20 text-rose-400 shadow-sm border border-rose-500/30'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    Inadimplente
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter('RISK')}
                    className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                      statusFilter === 'RISK'
                        ? 'bg-rose-500/30 text-rose-300 shadow-sm border border-rose-500/50'
                        : 'text-rose-400/80 hover:text-rose-400'
                    }`}
                  >
                    <ShieldAlert className="h-3 w-3" />
                    <span>Em Risco (&gt;5 dias)</span>
                  </button>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por delivery, cliente, cidade..."
                    className="w-full rounded-lg border border-white/10 bg-surface-canvas pl-9 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
                  />
                </div>
              </div>

              {/* Tabela de Contratos & Cobrança */}
              <BillingTable
                items={items}
                onUpdatePaymentStatus={handleUpdatePaymentStatus}
                onEditContract={handleOpenEditContract}
              />
            </div>
          )}

          {/* Conteúdo da Aba 3: Demonstrativo do Resultado (DRE) */}
          {activeTab === 'DRE' && (
            <div className="space-y-6">
              {/* Gráfico MoM de Apoio Contábil */}
              <MonthlyComparisonChart
                data={monthlyClosings}
                periodMonths={closingMonths}
                onPeriodChange={(m) => setClosingMonths(m)}
                isLoading={isLoading}
              />

              {/* Tabela DRE Analítica Completa */}
              <DreStatementTable data={monthlyClosings} isLoading={isLoading} />
            </div>
          )}
        </div>
      </main>

      {/* Modais */}
      <ContractModal
        isOpen={isContractModalOpen}
        client={selectedClient}
        onClose={() => {
          setIsContractModalOpen(false);
          setSelectedClient(null);
        }}
        onSuccess={() => fetchData(true)}
      />

      <ExpenseManagerModal
        isOpen={isExpenseModalOpen}
        expenseToEdit={expenseToEdit}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setExpenseToEdit(null);
        }}
        onSuccess={() => fetchData(true)}
      />
    </>
  );
}
