'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import {
  FileText,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  TrendingUp,
} from 'lucide-react';

interface AutomatedReportModalProps {
  clientId: string;
  clientName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function getDefaultDates() {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 7);
  return {
    start: weekStart.toISOString().split('T')[0],
    end: today.toISOString().split('T')[0],
  };
}

export function AutomatedReportModal({
  clientId,
  clientName,
  isOpen,
  onClose,
  onSuccess,
}: AutomatedReportModalProps) {
  const defaultDates = getDefaultDates();
  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);
  const [faturamentoTotal, setFaturamentoTotal] = useState('');
  const [pedidosTotais, setPedidosTotais] = useState('');
  const [analiseGestor, setAnaliseGestor] = useState('');
  const [proximasAcoes, setProximasAcoes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);

    try {
      await api.post(`/reports/clients/${clientId}/auto-generate`, {
        weekStartDate: new Date(startDate).toISOString(),
        weekEndDate: new Date(endDate).toISOString(),
        faturamentoTotal: faturamentoTotal ? parseFloat(faturamentoTotal) : undefined,
        pedidosTotais: pedidosTotais ? parseInt(pedidosTotais, 10) : undefined,
        analiseGestor: analiseGestor.trim() || undefined,
        proximasAcoes: proximasAcoes.trim() || undefined,
      });

      alert('Relatório semanal emitido com sucesso a partir dos dados reais da Meta!');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Falha ao gerar relatório automático via Meta Ads. Verifique a conexão com a Meta.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-card rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-white/10 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand/10 text-brand">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-text-primary text-base">
                Emitir Relatório Semanal Automático
              </h3>
              <p className="text-xs text-text-muted mt-0.5">{clientName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-text-muted hover:text-text-primary rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner Informativo de Dependência Total da Meta */}
        <div className="p-3.5 rounded-xl bg-brand/10 border border-brand/20 text-xs text-text-secondary space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-brand">
            <CheckCircle2 className="w-4 h-4" />
            Zero digitação manual de números
          </div>
          <p className="text-[11px] text-text-muted leading-relaxed">
            O MOVY consulta a Meta Graph API para o período selecionado e preenche automaticamente
            Investimento, Impressões, Cliques, Conversas, CPA, ROAS e CPR.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Período da Semana */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">
                Data Inicial da Semana
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-surface-canvas border border-white/10 rounded-lg text-text-primary focus:border-brand focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">
                Data Final da Semana
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-surface-canvas border border-white/10 rounded-lg text-text-primary focus:border-brand focus:outline-none"
              />
            </div>
          </div>

          {/* Vendas do Delivery (Opcional para ROAS) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">
                Faturamento Delivery R$ (Opcional)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="ex: 12500.00"
                value={faturamentoTotal}
                onChange={(e) => setFaturamentoTotal(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-surface-canvas border border-white/10 rounded-lg text-text-primary focus:border-brand focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">
                Total de Pedidos (Opcional)
              </label>
              <input
                type="number"
                min="0"
                placeholder="ex: 142"
                value={pedidosTotais}
                onChange={(e) => setPedidosTotais(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-surface-canvas border border-white/10 rounded-lg text-text-primary focus:border-brand focus:outline-none"
              />
            </div>
          </div>

          {/* Análise Textual do Gestor */}
          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1">
              Análise Técnica do Gestor (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Excelente volume de conversas no fim de semana. Sugiro aumentar orçamento na sexta-feira..."
              value={analiseGestor}
              onChange={(e) => setAnaliseGestor(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-surface-canvas border border-white/10 rounded-lg text-text-primary focus:border-brand focus:outline-none placeholder:text-text-muted"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1">
              Próximas Ações Recomendadas (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Subir 3 novos criativos de combos promocionais para quarta-feira."
              value={proximasAcoes}
              onChange={(e) => setProximasAcoes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-surface-canvas border border-white/10 rounded-lg text-text-primary focus:border-brand focus:outline-none placeholder:text-text-muted"
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-text-muted bg-surface-canvas hover:bg-white/5 rounded-lg transition-colors border border-white/10"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className="px-4 py-2 text-xs font-bold text-white bg-brand hover:bg-brand-hover disabled:opacity-50 rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-md shadow-brand/20 active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isGenerating ? 'Puxando Meta & Emitindo...' : 'Emitir Relatório Semanal'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
