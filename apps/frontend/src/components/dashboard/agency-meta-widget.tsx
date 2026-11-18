import React from 'react';
import { Megaphone, DollarSign, Users, MousePointerClick, Eye, ShieldCheck, AlertCircle } from 'lucide-react';
import { DashboardOverview } from '@/types';

interface AgencyMetaWidgetProps {
  agencyData: DashboardOverview['agencyMeta'];
}

export function AgencyMetaWidget({ agencyData }: AgencyMetaWidgetProps) {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="rounded-2xl border border-white/10 bg-surface-card p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-brand" />
              Meta Ads Agência MOVY (Captação Própria)
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Tráfego pago institucional para captação de novos deliveries
            </p>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
              agencyData.configured
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}
          >
            {agencyData.configured ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5" />
                Conectado (.env)
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5" />
                Configuração Pendente
              </>
            )}
          </span>
        </div>

        {!agencyData.configured ? (
          <div className="py-8 text-center space-y-2">
            <div className="mx-auto w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text-muted">
              <Megaphone className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-text-primary">
              Conta da Agência não conectada
            </p>
            <p className="text-xs text-text-muted max-w-sm mx-auto">
              Defina <code className="text-brand font-mono">AGENCY_META_ACCOUNT_ID</code> e{' '}
              <code className="text-brand font-mono">AGENCY_META_ACCESS_TOKEN</code> no arquivo{' '}
              <code className="text-text-primary font-mono">.env</code> do backend para visualizar o investimento da agência.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5">
            {/* Investimento da Agência */}
            <div className="p-3.5 rounded-xl border border-white/5 bg-white/5 space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-brand" />
                Gasto Próprio
              </span>
              <p className="text-lg font-bold text-brand">
                {formatCurrency(agencyData.spend)}
              </p>
              <p className="text-[10px] text-text-muted">Campanha MOVY</p>
            </div>

            {/* Leads Inbound Gerados */}
            <div className="p-3.5 rounded-xl border border-white/5 bg-white/5 space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1">
                <Users className="w-3 h-3 text-emerald-400" />
                Leads Inbound
              </span>
              <p className="text-lg font-bold text-emerald-400">
                {agencyData.leadsGenerated}
              </p>
              <p className="text-[10px] text-text-muted">Captados no funil</p>
            </div>

            {/* Custo por Lead (CPL) */}
            <div className="p-3.5 rounded-xl border border-white/5 bg-white/5 space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1">
                CPL Médio
              </span>
              <p className="text-lg font-bold text-text-primary">
                {formatCurrency(agencyData.costPerLead)}
              </p>
              <p className="text-[10px] text-text-muted">Custo por lead da agência</p>
            </div>

            {/* Cliques & Alcance */}
            <div className="p-3.5 rounded-xl border border-white/5 bg-white/5 space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1">
                <MousePointerClick className="w-3 h-3 text-blue-400" />
                Cliques
              </span>
              <p className="text-lg font-bold text-blue-400">
                {agencyData.clicks}
              </p>
              <p className="text-[10px] text-text-muted">{agencyData.impressions} impressões</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-text-muted">
        <span>Conta: <code className="text-text-primary font-mono">{agencyData.adAccountId || 'Não configurada'}</code></span>
        <span className="text-brand font-medium">Tráfego Institucional</span>
      </div>
    </div>
  );
}
