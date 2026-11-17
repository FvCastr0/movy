'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Client, Contract, PlanCycle, PlanType, PaymentStatus } from '@/types';
import { X, FileText, Check, DollarSign, Calendar, Sparkles, AlertCircle } from 'lucide-react';

interface ContractModalProps {
  isOpen: boolean;
  client: Client | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ContractModal({ isOpen, client, onClose, onSuccess }: ContractModalProps) {
  const [cycle, setCycle] = useState<PlanCycle>('TRIMESTRAL');
  const [planType, setPlanType] = useState<PlanType>('TRIMESTRAL_REUNIAO');
  const [totalValue, setTotalValue] = useState('4500');
  const [mrrEquivalent, setMrrEquivalent] = useState('1500');
  const [setupValue, setSetupValue] = useState('0');
  const [dueDay, setDueDay] = useState('10');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('EM_DIA');
  const [mediaBudget, setMediaBudget] = useState('1500');
  const [operationalCost, setOperationalCost] = useState('150');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyPreset = (preset: PlanType) => {
    setPlanType(preset);
    if (preset === 'TRIMESTRAL_REUNIAO') {
      setCycle('TRIMESTRAL');
      setTotalValue('4500');
      setMrrEquivalent('1500');
      setMediaBudget('1500');
      setDueDay('10');
    } else if (preset === 'TRIMESTRAL_NORMAL') {
      setCycle('TRIMESTRAL');
      setTotalValue('6000');
      setMrrEquivalent('2000');
      setMediaBudget('1500');
      setDueDay('10');
    } else if (preset === 'MENSAL_REUNIAO') {
      setCycle('MENSAL');
      setTotalValue('2000');
      setMrrEquivalent('2000');
      setMediaBudget('1500');
      setDueDay('10');
    } else if (preset === 'MENSAL_NORMAL') {
      setCycle('MENSAL');
      setTotalValue('2200');
      setMrrEquivalent('2200');
      setMediaBudget('1500');
      setDueDay('10');
    }
  };

  useEffect(() => {
    if (!isOpen || !client) return;

    if (client.contract) {
      const c = client.contract;
      setCycle(c.cycle);
      setPlanType(c.planType);
      setTotalValue(String(c.totalValue));
      setMrrEquivalent(String(c.mrrEquivalent));
      setSetupValue(String(c.setupValue || 0));
      setDueDay(String(c.dueDay));
      setPaymentStatus(c.paymentStatus);
      setMediaBudget(String(c.mediaBudget || 1500));
      setOperationalCost(String(c.operationalCost || 150));
      setStartDate(c.startDate ? new Date(c.startDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
      setNotes(c.notes || '');
    } else {
      // Preset padrão oficial da Movy: Trimestral Reunião
      applyPreset('TRIMESTRAL_REUNIAO');
    }
  }, [client, isOpen]);

  if (!isOpen || !client) return null;


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await api.put(`/finance/clients/${client.id}/contract`, {
        cycle,
        planType,
        totalValue: parseFloat(totalValue) || 0,
        mrrEquivalent: parseFloat(mrrEquivalent) || 0,
        setupValue: parseFloat(setupValue) || 0,
        dueDay: parseInt(dueDay, 10) || 10,
        paymentStatus,
        mediaBudget: parseFloat(mediaBudget) || 1500,
        operationalCost: parseFloat(operationalCost) || 150,
        startDate: new Date(startDate).toISOString(),
        notes: notes.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Falha ao salvar o contrato no servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-surface-card p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/15 text-brand">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">Contrato & Cobrança</h3>
              <p className="text-xs text-text-muted">{client.deliveryNome} ({client.nome})</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-muted hover:bg-white/5 hover:text-text-primary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Presets Oficiais Movy */}
        <div className="mt-4">
          <label className="block text-xs font-semibold text-text-primary mb-2 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-brand" />
            <span>Planos Oficiais do Manual do Closer Movy</span>
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => applyPreset('TRIMESTRAL_REUNIAO')}
              className={`rounded-lg border p-2 text-left transition-all ${planType === 'TRIMESTRAL_REUNIAO'
                  ? 'border-brand bg-brand/15 text-text-primary'
                  : 'border-white/10 bg-surface-canvas hover:border-white/20 text-text-muted'
                }`}
            >
              <div className="text-[10px] font-bold uppercase text-brand">★ Recomendado</div>
              <div className="text-xs font-bold text-text-primary">Trimestral Reunião</div>
              <div className="text-[11px] text-emerald-400 font-semibold">R$ 4.500 (1.500/mês)</div>
            </button>

            <button
              type="button"
              onClick={() => applyPreset('TRIMESTRAL_NORMAL')}
              className={`rounded-lg border p-2 text-left transition-all ${planType === 'TRIMESTRAL_NORMAL'
                  ? 'border-brand bg-brand/15 text-text-primary'
                  : 'border-white/10 bg-surface-canvas hover:border-white/20 text-text-muted'
                }`}
            >
              <div className="text-[10px] font-bold uppercase text-text-muted">Normal</div>
              <div className="text-xs font-bold text-text-primary">Trimestral Normal</div>
              <div className="text-[11px] text-text-muted">R$ 6.000 (2.000/mês)</div>
            </button>

            <button
              type="button"
              onClick={() => applyPreset('MENSAL_REUNIAO')}
              className={`rounded-lg border p-2 text-left transition-all ${planType === 'MENSAL_REUNIAO'
                  ? 'border-brand bg-brand/15 text-text-primary'
                  : 'border-white/10 bg-surface-canvas hover:border-white/20 text-text-muted'
                }`}
            >
              <div className="text-[10px] font-bold uppercase text-text-muted">Reunião</div>
              <div className="text-xs font-bold text-text-primary">Mensal Reunião</div>
              <div className="text-[11px] text-text-muted">R$ 2.000/mês</div>
            </button>

            <button
              type="button"
              onClick={() => applyPreset('MENSAL_NORMAL')}
              className={`rounded-lg border p-2 text-left transition-all ${planType === 'MENSAL_NORMAL'
                  ? 'border-brand bg-brand/15 text-text-primary'
                  : 'border-white/10 bg-surface-canvas hover:border-white/20 text-text-muted'
                }`}
            >
              <div className="text-[10px] font-bold uppercase text-text-muted">Tabela</div>
              <div className="text-xs font-bold text-text-primary">Mensal Normal</div>
              <div className="text-[11px] text-text-muted">R$ 2.200/mês</div>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Ciclo Contratual
              </label>
              <select
                value={cycle}
                onChange={(e) => setCycle(e.target.value as PlanCycle)}
                className="w-full rounded-lg border border-white/10 bg-surface-canvas px-3 py-2 text-xs text-text-primary focus:border-brand focus:outline-none"
              >
                <option value="TRIMESTRAL">Trimestral (Antecipado)</option>
                <option value="MENSAL">Mensal Recorrente</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Valor Total Contrato (R$)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-muted" />
                <input
                  type="number"
                  step="50"
                  required
                  value={totalValue}
                  onChange={(e) => setTotalValue(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 py-2 text-xs text-text-primary focus:border-brand focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                MRR Contábil Equivalente (R$)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-muted" />
                <input
                  type="number"
                  step="50"
                  required
                  value={mrrEquivalent}
                  onChange={(e) => setMrrEquivalent(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 py-2 text-xs text-text-primary focus:border-brand focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Dia do Vencimento (1 a 31)
              </label>
              <input
                type="number"
                min="1"
                max="31"
                required
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-text-primary focus:border-brand focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Status de Cobrança
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                className="w-full rounded-lg border border-white/10 bg-surface-canvas px-3 py-2 text-xs text-text-primary focus:border-brand focus:outline-none"
              >
                <option value="EM_DIA">Em dia (Pago)</option>
                <option value="PENDENTE">Pendente</option>
                <option value="INADIMPLENTE">Inadimplente (Atrasado)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Data de Início
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-text-primary focus:border-brand focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Verba de Anúncios Meta Ads (R$)
              </label>
              <input
                type="number"
                step="100"
                value={mediaBudget}
                onChange={(e) => setMediaBudget(e.target.value)}
                placeholder="1500"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-text-primary focus:border-brand focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Custo de Ferramentas / COGS (R$)
              </label>
              <input
                type="number"
                step="10"
                value={operationalCost}
                onChange={(e) => setOperationalCost(e.target.value)}
                placeholder="150"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-text-primary focus:border-brand focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Taxa de Setup Pontual (R$)
              </label>
              <input
                type="number"
                step="100"
                value={setupValue}
                onChange={(e) => setSetupValue(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-text-primary focus:border-brand focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Observações Contratuais / Acordos
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Pagou à vista via Pix no ato da reunião comercial"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-text-muted hover:bg-white/5 hover:text-text-primary transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white shadow-md shadow-brand/20 hover:bg-brand-hover transition-colors disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              <span>{isSubmitting ? 'Salvando...' : 'Salvar Contrato'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
