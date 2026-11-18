'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { RiskStatus } from '@/types';
import { 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Wallet, 
  Calendar, 
  PlusCircle, 
  RefreshCw, 
  DollarSign, 
  ArrowUpRight, 
  ShieldAlert,
  Info
} from 'lucide-react';

interface RiskSemaphoreCardProps {
  clientId: string;
  clientName?: string;
  onRefreshParent?: () => void;
}

export function RiskSemaphoreCard({ clientId, clientName, onRefreshParent }: RiskSemaphoreCardProps) {
  const [riskData, setRiskData] = useState<RiskStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form para inclusão rápida de snapshot diário
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formSpend, setFormSpend] = useState<string>('50');
  const [formBalance, setFormBalance] = useState<string>('300');
  const [formConversas, setFormConversas] = useState<string>('10');

  const fetchRiskStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<RiskStatus>(`/onboarding/${clientId}/risk-status`);
      setRiskData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao carregar semáforo de risco operacional.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchRiskStatus();
    }
  }, [clientId]);

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const spendNum = parseFloat(formSpend) || 0;
      const balanceNum = parseFloat(formBalance) || 0;
      const conversasNum = parseInt(formConversas, 10) || 0;
      const calculatedCpa = conversasNum > 0 ? spendNum / conversasNum : spendNum;

      await api.post(`/onboarding/${clientId}/daily-metrics`, {
        date: new Date(formDate).toISOString(),
        spend: spendNum,
        balance: balanceNum,
        conversas: conversasNum,
        cpa: calculatedCpa,
      });

      setShowAddModal(false);
      await fetchRiskStatus();
      if (onRefreshParent) onRefreshParent();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Erro ao registrar snapshot de métricas.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  if (loading && !riskData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm animate-pulse">
        <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-24 bg-gray-100 dark:bg-gray-750 rounded-lg" />
          <div className="h-24 bg-gray-100 dark:bg-gray-750 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !riskData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            Semáforo de Risco Operacional
          </h3>
          <button
            onClick={fetchRiskStatus}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Nenhuma métrica de tráfego registrada ainda para análise de risco.
        </p>
        <button
          onClick={() => setShowAddModal(true)}
          className="mt-4 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium rounded-lg inline-flex items-center gap-1.5 transition-colors"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Lançar Primeiro Snapshot
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white text-base">
              Semáforo de Risco Operacional (Meta Ads)
            </h3>
            {riskData.isLowBalance || riskData.isCpaSpike ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertTriangle className="w-3 h-3" /> Atenção Necessária
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle2 className="w-3 h-3" /> Estável
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Monitoramento de verba para fins de semana e detecção de spike de CPA (&gt;30%)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-650 text-gray-700 dark:text-gray-200 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 transition-colors"
            title="Lançar snapshot diário de investimento"
          >
            <PlusCircle className="w-3.5 h-3.5 text-brand-500" />
            + Lançar Métricas
          </button>
          <button
            onClick={fetchRiskStatus}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            title="Recarregar status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cards de Semáforo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Semáforo 1: Saldo vs Fim de Semana */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            riskData.isLowBalance
              ? 'bg-rose-50/70 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/50'
              : 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`p-2 rounded-lg ${
                  riskData.isLowBalance
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                }`}
              >
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  Saldo Meta Ads
                </span>
                <div className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
                  {formatCurrency(riskData.currentBalance)}
                </div>
              </div>
            </div>

            <span
              className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                riskData.isLowBalance
                  ? 'bg-rose-600 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {riskData.isLowBalance ? 'Risco Crítico' : 'Seguro'}
            </span>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-200/60 dark:border-gray-700/60 text-xs text-gray-600 dark:text-gray-300 space-y-1">
            <div className="flex justify-between">
              <span>Gasto médio diário:</span>
              <span className="font-semibold">{formatCurrency(riskData.avgDailySpend)}/dia</span>
            </div>
            <div className="flex justify-between">
              <span>Mínimo para o Fim de Semana (2.5x):</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(riskData.weekendSpendRequired)}
              </span>
            </div>
          </div>

          {riskData.isLowBalance && (
            <div className="mt-3 p-2.5 rounded-lg bg-rose-100/90 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>
                <strong>Aviso Preventivo:</strong> Saldo insuficiente para cobrir o fim de semana.
                Solicite recarga ao cliente até quinta-feira para não pausar anúncios!
              </span>
            </div>
          )}
        </div>

        {/* Semáforo 2: Disparo de CPA (Spike > 30%) */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            riskData.isCpaSpike
              ? 'bg-amber-50/70 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50'
              : 'bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/40'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`p-2 rounded-lg ${
                  riskData.isCpaSpike
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  CPA Recente (3 dias)
                </span>
                <div className="text-xl font-bold text-gray-900 dark:text-white mt-0.5 flex items-baseline gap-2">
                  <span>{formatCurrency(riskData.cpaRecent)}</span>
                  {riskData.hasMetrics && riskData.cpaBaseline > 0 && (
                    <span
                      className={`text-xs font-semibold flex items-center ${
                        riskData.cpaDiffPercent > 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      <ArrowUpRight className="w-3 h-3 inline" />
                      {riskData.cpaDiffPercent > 0 ? '+' : ''}
                      {riskData.cpaDiffPercent.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            <span
              className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                riskData.isCpaSpike
                  ? 'bg-amber-600 text-white'
                  : 'bg-blue-600 text-white'
              }`}
            >
              {riskData.isCpaSpike ? 'Spike >30%' : 'Normal'}
            </span>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-200/60 dark:border-gray-700/60 text-xs text-gray-600 dark:text-gray-300 space-y-1">
            <div className="flex justify-between">
              <span>CPA Baseline (últimos 7 dias):</span>
              <span className="font-semibold">{formatCurrency(riskData.cpaBaseline)}</span>
            </div>
            <div className="flex justify-between">
              <span>Status de Eficiência:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {riskData.isCpaSpike ? 'Custo por Lead Elevado' : 'Dentro do range aceitável'}
              </span>
            </div>
          </div>

          {riskData.isCpaSpike && (
            <div className="mt-3 p-2.5 rounded-lg bg-amber-100/90 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <span>
                <strong>Ação Recomendada:</strong> Fadiga de criativo ou concorrência de leilão.
                Gere novas variações de criativos ou refine os públicos no Gerenciador.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tabela de Snapshots Recentes */}
      {riskData.recentMetrics && riskData.recentMetrics.length > 0 && (
        <div className="pt-2">
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
            Últimos Snapshots Diários Registrados
          </h4>
          <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-700">
            <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 dark:bg-gray-750 text-gray-700 dark:text-gray-200 font-semibold border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="py-2 px-3">Data</th>
                  <th className="py-2 px-3">Investido</th>
                  <th className="py-2 px-3">Saldo em Conta</th>
                  <th className="py-2 px-3">Conversas</th>
                  <th className="py-2 px-3">CPA (Custo/Conv.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {riskData.recentMetrics.slice(0, 5).map((m, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-750/50">
                    <td className="py-2 px-3 font-medium text-gray-900 dark:text-white">
                      {new Date(m.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-2 px-3">{formatCurrency(m.spend)}</td>
                    <td className="py-2 px-3 font-mono">{formatCurrency(m.balance)}</td>
                    <td className="py-2 px-3">{m.conversas}</td>
                    <td className="py-2 px-3 font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(m.cpa)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Lançar Snapshot */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white text-base flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-brand-500" />
                Registrar Snapshot Diário de Anúncios
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSnapshot} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Data do Snapshot
                </label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Valor Investido (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    value={formSpend}
                    onChange={(e) => setFormSpend(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Saldo Restante (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    value={formBalance}
                    onChange={(e) => setFormBalance(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Conversas Iniciadas (WhatsApp / Direct)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formConversas}
                  onChange={(e) => setFormConversas(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 rounded-lg transition-colors inline-flex items-center gap-1.5"
                >
                  {submitting ? 'Salvando...' : 'Salvar Snapshot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
