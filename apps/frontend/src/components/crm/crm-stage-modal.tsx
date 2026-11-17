'use client';

import React, { useState, useEffect } from 'react';
import { Lead, LeadStage } from '@/types';
import { X, Calendar, AlertOctagon, DollarSign, Check } from 'lucide-react';

interface CrmStageModalProps {
  isOpen: boolean;
  lead: Lead | null;
  targetStage: LeadStage | null;
  onClose: () => void;
  onConfirm: (leadId: string, stage: LeadStage, data: { lostReason?: string; meetingDate?: string; dealValue?: number }) => Promise<void>;
}

const COMMON_LOST_REASONS = [
  'Sem verba / Achou caro',
  'Optou por concorrente / agência anterior',
  'No-Show recorrente / Parou de responder',
  'Não é o decisor / Sócio reprovou',
  'Desqualificado pelo SDR (fora do perfil delivery)',
  'Momento ruim (vai abrir filial depois)',
  'Outro motivo',
];

export function CrmStageModal({ isOpen, lead, targetStage, onClose, onConfirm }: CrmStageModalProps) {
  const [lostReason, setLostReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [dealValue, setDealValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lead) {
      setDealValue(lead.dealValue ? String(lead.dealValue) : '');
      setLostReason(lead.lostReason || COMMON_LOST_REASONS[0]);
      if (lead.meetingDate) {
        const d = new Date(lead.meetingDate);
        setMeetingDate(d.toISOString().slice(0, 16));
      } else {
        // Sugere dia seguinte às 15:00
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(15, 0, 0, 0);
        setMeetingDate(tomorrow.toISOString().slice(0, 16));
      }
    }
  }, [lead, targetStage]);

  if (!isOpen || !lead || !targetStage) return null;

  const isLostStage = targetStage === 'PERDIDO';
  const isMeetingStage = targetStage === 'REUNIAO_AGENDADA';

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload: { lostReason?: string; meetingDate?: string; dealValue?: number } = {};

    if (isLostStage) {
      const finalReason = lostReason === 'Outro motivo' ? customReason.trim() : lostReason;
      if (!finalReason) {
        return setError('Por favor, informe o motivo da perda do lead.');
      }
      payload.lostReason = finalReason;
    }

    if (isMeetingStage) {
      if (!meetingDate) {
        return setError('Informe a data e horário agendados para a reunião.');
      }
      payload.meetingDate = new Date(meetingDate).toISOString();
    }

    if (dealValue) {
      payload.dealValue = parseFloat(dealValue);
    }

    setIsSubmitting(true);
    try {
      await onConfirm(lead.id, targetStage, payload);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Falha ao atualizar o estágio no servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-surface-card p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            {isLostStage ? (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/15 text-rose-400">
                <AlertOctagon className="h-5 w-5" />
              </div>
            ) : isMeetingStage ? (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/15 text-brand">
                <Calendar className="h-5 w-5" />
              </div>
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-text-primary">
                <Check className="h-5 w-5" />
              </div>
            )}
            <div>
              <h3 className="text-base font-bold text-text-primary">
                {isLostStage ? 'Registrar Perda do Lead' : isMeetingStage ? 'Agendar Reunião c/ Closer' : `Mover para ${targetStage}`}
              </h3>
              <p className="text-xs text-text-muted">{lead.deliveryNome} ({lead.nome})</p>
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
          <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleConfirm} className="mt-4 space-y-4">
          {/* Seção de Perda */}
          {isLostStage && (
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                Motivo da Perda <span className="text-rose-400">*</span>
              </label>
              <select
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-surface-canvas px-3 py-2 text-xs text-text-primary focus:border-brand focus:outline-none"
              >
                {COMMON_LOST_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              {lostReason === 'Outro motivo' && (
                <div className="mt-2">
                  <input
                    type="text"
                    required
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Descreva o motivo..."
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
                  />
                </div>
              )}
            </div>
          )}

          {/* Seção de Agendamento de Reunião */}
          {isMeetingStage && (
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                Data e Horário da Reunião <span className="text-rose-400">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-surface-canvas px-3 py-2 text-xs text-text-primary focus:border-brand focus:outline-none"
              />
            </div>
          )}

          {/* Valor previsto da proposta */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              Valor Previsto de Fechamento (R$ fee/mês)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-muted" />
              <input
                type="number"
                step="100"
                min="0"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
                placeholder="2500"
                className="w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
              />
            </div>
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
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold text-white transition-colors disabled:opacity-50 ${
                isLostStage ? 'bg-rose-600 hover:bg-rose-500' : 'bg-brand hover:bg-brand-hover shadow-md shadow-brand/20'
              }`}
            >
              {isSubmitting ? 'Salvando...' : 'Confirmar Mudança'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
