import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  UserPlus,
  PhoneCall,
  Calendar,
  AlertTriangle,
  Send,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface CommercialFunnelWidgetProps {
  leadsByStage: Record<string, number>;
  totalLeads: number;
  conversionRate: number;
  bookingRate?: number;
  noShowRate?: number;
  agendadosCount?: number;
  noShowCount?: number;
}

export function CommercialFunnelWidget({
  leadsByStage,
  totalLeads,
  conversionRate,
  bookingRate = 0,
  noShowRate = 0,
}: CommercialFunnelWidgetProps) {
  const stages = [
    { key: 'NOVO', label: 'Novos', icon: UserPlus, color: 'bg-blue-500' },
    { key: 'CONTATO_INICIADO', label: 'Contato', icon: PhoneCall, color: 'bg-indigo-500' },
    { key: 'REUNIAO_AGENDADA', label: 'Reunião', icon: Calendar, color: 'bg-purple-500' },
    { key: 'NO_SHOW', label: 'No-Show', icon: AlertTriangle, color: 'bg-rose-500' },
    { key: 'PROPOSTA_ENVIADA', label: 'Proposta', icon: Send, color: 'bg-cyan-500' },
    { key: 'FECHADO', label: 'Fechados', icon: CheckCircle2, color: 'bg-emerald-500' },
    { key: 'PERDIDO', label: 'Perdidos', icon: XCircle, color: 'bg-zinc-500' },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-surface-card p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <h3 className="text-base font-bold text-text-primary">Pipeline Comercial (CRM)</h3>
            <p className="text-xs text-text-muted mt-0.5">
              Distribuição e taxas históricas do funil comercial
            </p>
          </div>
          <Link
            href="/crm"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-brand-hover transition-colors"
          >
            Abrir CRM
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Funil Visual em Barras Horizontais */}
        <div className="space-y-3 pt-5">
          {stages.map((st) => {
            const count = leadsByStage[st.key] || 0;
            const percentage = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
            const Icon = st.icon;

            return (
              <div key={st.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 font-medium text-text-primary">
                    <Icon className="w-3.5 h-3.5 text-text-muted" />
                    {st.label}
                  </span>
                  <div className="flex items-center gap-2 text-text-muted">
                    <strong className="text-text-primary">{count}</strong>
                    <span>({percentage}%)</span>
                  </div>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${st.color} transition-all duration-500`}
                    style={{ width: `${Math.max(percentage, count > 0 ? 4 : 0)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Métricas Consolidadas no Rodapé */}
      <div className="mt-5 pt-3.5 border-t border-white/10 grid grid-cols-3 gap-2 text-center text-xs text-text-muted">
        <div className="rounded-lg bg-white/[0.02] p-2 border border-white/5">
          <span className="block text-[10px] uppercase font-semibold text-text-muted">Agendamento</span>
          <strong className="text-brand text-sm">{bookingRate}%</strong>
        </div>
        <div className="rounded-lg bg-white/[0.02] p-2 border border-white/5">
          <span className="block text-[10px] uppercase font-semibold text-rose-400">No-Show</span>
          <strong className="text-rose-400 text-sm">{noShowRate}%</strong>
        </div>
        <div className="rounded-lg bg-white/[0.02] p-2 border border-white/5">
          <span className="block text-[10px] uppercase font-semibold text-emerald-400">Fechamento</span>
          <strong className="text-emerald-400 text-sm">{conversionRate}%</strong>
        </div>
      </div>
    </div>
  );
}
