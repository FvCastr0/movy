import React from 'react';
import Link from 'next/link';
import { AlertCircle, AlertTriangle, Info, ArrowRight, Wallet, Calendar, FileWarning } from 'lucide-react';
import { DashboardOverview } from '@/types';

interface AlertsFeedWidgetProps {
  alerts: DashboardOverview['recentAlerts'];
}

export function AlertsFeedWidget({ alerts }: AlertsFeedWidgetProps) {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'balance':
        return Wallet;
      case 'contract':
        return Calendar;
      case 'report':
      default:
        return FileWarning;
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-surface-card p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              Central de Alertas & Riscos
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Notificações de saldo baixo, contratos vencendo e relatórios pendentes
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/5 border border-white/10 text-text-muted">
            {alerts.length} ativo(s)
          </span>
        </div>

        {alerts.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <div className="mx-auto w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              ✓
            </div>
            <p className="text-sm font-semibold text-text-primary">Tudo em ordem!</p>
            <p className="text-xs text-text-muted">
              Nenhum alerta crítico de saldo ou contrato no momento.
            </p>
          </div>
        ) : (
          <div className="space-y-3 pt-4 max-h-[360px] overflow-y-auto pr-1">
            {alerts.slice(0, 6).map((al) => {
              const CategoryIcon = getCategoryIcon(al.category);
              const isCritical = al.type === 'critical';
              const isWarning = al.type === 'warning';

              return (
                <div
                  key={al.id}
                  className={`p-3.5 rounded-xl border transition-all ${isCritical
                      ? 'bg-rose-500/10 border-rose-500/30'
                      : isWarning
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-white/5 border-white/10'
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-1.5 rounded-lg shrink-0 ${isCritical
                          ? 'bg-rose-500/20 text-rose-400'
                          : isWarning
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-white/10 text-text-muted'
                        }`}
                    >
                      <CategoryIcon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4
                          className={`text-xs font-bold truncate ${isCritical
                              ? 'text-rose-400'
                              : isWarning
                                ? 'text-amber-400'
                                : 'text-text-primary'
                            }`}
                        >
                          {al.title}
                        </h4>
                        <span className="text-[10px] text-text-muted shrink-0 uppercase tracking-wider">
                          {al.category === 'balance'
                            ? 'Saldo Ads'
                            : al.category === 'contract'
                              ? 'Contrato'
                              : 'Relatório'}
                        </span>
                      </div>

                      <p className="text-xs text-text-muted mt-1 leading-relaxed">
                        {al.description}
                      </p>

                      {al.clientId && (
                        <div className="mt-2">
                          <Link
                            href={`/clients/${al.clientId}`}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:text-brand-hover transition-colors"
                          >
                            Ver cliente
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
