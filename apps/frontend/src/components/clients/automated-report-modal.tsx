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
  Clock,
} from 'lucide-react';

interface AutomatedReportModalProps {
  clientId: string;
  clientName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export type PresetPeriod = '7d' | '14d' | '30d' | 'custom';

function formatToLocalDateInput(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calculateDatesForPreset(preset: '7d' | '14d' | '30d') {
  const today = new Date();
  const daysToSubtract = preset === '7d' ? 7 : preset === '14d' ? 14 : 30;

  const pastDate = new Date(today);
  pastDate.setDate(today.getDate() - daysToSubtract);

  return {
    start: formatToLocalDateInput(pastDate),
    end: formatToLocalDateInput(today),
  };
}

export function AutomatedReportModal({
  clientId,
  clientName,
  isOpen,
  onClose,
  onSuccess,
}: AutomatedReportModalProps) {
  const [preset, setPreset] = useState<PresetPeriod>('7d');
  const initialRange = calculateDatesForPreset('7d');

  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);
  const [faturamentoTotal, setFaturamentoTotal] = useState('');
  const [pedidosTotais, setPedidosTotais] = useState('');
  const [analiseGestor, setAnaliseGestor] = useState('');
  const [proximasAcoes, setProximasAcoes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectPreset = (newPreset: PresetPeriod) => {
    setPreset(newPreset);
    if (newPreset !== 'custom') {
      const dates = calculateDatesForPreset(newPreset);
      setStartDate(dates.start);
      setEndDate(dates.end);
    }
  };

  const handleDateChange = (type: 'start' | 'end', val: string) => {
    setPreset('custom');
    if (type === 'start') {
      setStartDate(val);
    } else {
      setEndDate(val);
    }
  };

  // Cálculo da quantidade de dias selecionados
  const calculateDaysDuration = () => {
    if (!startDate || !endDate) return 0;
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diffTime = e.getTime() - s.getTime();
    if (isNaN(diffTime) || diffTime < 0) return 0;
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  const totalDays = calculateDaysDuration();
  const isInvalidDateRange = totalDays <= 0 || new Date(startDate) > new Date(endDate);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isInvalidDateRange) {
      setError('A Data Inicial não pode ser posterior à Data Final.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      await api.post(`/reports/clients/${clientId}/auto-generate`, {
        weekStartDate: new Date(`${startDate}T00:00:00Z`).toISOString(),
        weekEndDate: new Date(`${endDate}T23:59:59Z`).toISOString(),
        faturamentoTotal: faturamentoTotal ? parseFloat(faturamentoTotal) : undefined,
        pedidosTotais: pedidosTotais ? parseInt(pedidosTotais, 10) : undefined,
        analiseGestor: analiseGestor.trim() || undefined,
        proximasAcoes: proximasAcoes.trim() || undefined,
      });

      alert(`Relatório de performance (${totalDays} dias) emitido com sucesso a partir dos dados reais da Meta!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        'Falha ao gerar relatório automático via Meta Ads. Verifique a conexão com a conta da Meta.'
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
                Emitir Relatório de Performance
              </h3>
              <p className="text-xs text-text-muted mt-0.5">{clientName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-text-muted hover:text-text-primary rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Seletores Rápidos de Período (Presets) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-text-muted">
              Janela de Análise
            </label>
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-surface-canvas rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => handleSelectPreset('7d')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                  preset === '7d'
                    ? 'bg-brand text-white shadow-sm shadow-brand/30'
                    : 'text-text-muted hover:text-text-primary hover:bg-white/5'
                }`}
              >
                7 dias
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('14d')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                  preset === '14d'
                    ? 'bg-brand text-white shadow-sm shadow-brand/30'
                    : 'text-text-muted hover:text-text-primary hover:bg-white/5'
                }`}
              >
                14 dias
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('30d')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                  preset === '30d'
                    ? 'bg-brand text-white shadow-sm shadow-brand/30'
                    : 'text-text-muted hover:text-text-primary hover:bg-white/5'
                }`}
              >
                30 dias (Mês)
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('custom')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                  preset === 'custom'
                    ? 'bg-brand text-white shadow-sm shadow-brand/30'
                    : 'text-text-muted hover:text-text-primary hover:bg-white/5'
                }`}
              >
                Personalizado
              </button>
            </div>
          </div>

          {/* Inputs de Data (com badge de duração) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">
                Data Inicial
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => handleDateChange('start', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-surface-canvas border border-white/10 rounded-lg text-text-primary focus:border-brand focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">
                Data Final
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => handleDateChange('end', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-surface-canvas border border-white/10 rounded-lg text-text-primary focus:border-brand focus:outline-none"
              />
            </div>
          </div>

          {/* Badge Informativo de Duração */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-canvas/60 border border-white/5 text-[11px] text-text-muted">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-brand" />
              Intervalo selecionado:
            </span>
            <span className={`font-semibold ${isInvalidDateRange ? 'text-rose-400' : 'text-emerald-400'}`}>
              {isInvalidDateRange ? 'Intervalo de datas inválido' : `${totalDays} dias de dados da Meta`}
            </span>
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
              placeholder="Ex: Excelente volume de conversas no período. Sugiro ampliar orçamento para as campanhas de maior retorno..."
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
              placeholder="Ex: Testar novos criativos com foco no almoço executivo e ajustar horários de veiculação."
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
              disabled={isGenerating || isInvalidDateRange}
              className="px-4 py-2 text-xs font-bold text-white bg-brand hover:bg-brand-hover disabled:opacity-50 rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-md shadow-brand/20 active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isGenerating ? 'Puxando Meta & Emitindo...' : 'Emitir Relatório de Performance'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
