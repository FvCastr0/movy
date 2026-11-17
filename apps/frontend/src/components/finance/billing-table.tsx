'use client';

import React from 'react';
import Link from 'next/link';
import { Client, Contract, PaymentStatus } from '@/types';
import {
  Store,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Edit,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface BillingRowData {
  client: Client;
  contract: Contract | null;
}

interface BillingTableProps {
  items: BillingRowData[];
  onUpdatePaymentStatus: (clientId: string, status: PaymentStatus) => Promise<void>;
  onEditContract: (client: Client) => void;
}

export function BillingTable({ items, onUpdatePaymentStatus, onEditContract }: BillingTableProps) {
  const formatCurrency = (val?: number | null) => {
    return (val || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    });
  };

  const getStatusBadge = (status?: PaymentStatus, isAtRisk?: boolean) => {
    if (isAtRisk) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2 py-0.5 text-[11px] font-bold text-rose-400 border border-rose-500/40 animate-pulse">
          <ShieldAlert className="h-3 w-3" />
          Pausar Anúncios!
        </span>
      );
    }

    switch (status) {
      case 'EM_DIA':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="h-3 w-3" />
            Em dia
          </span>
        );
      case 'PENDENTE':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-400 border border-amber-500/30">
            <Clock className="h-3 w-3" />
            Pendente
          </span>
        );
      case 'INADIMPLENTE':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] font-semibold text-rose-400 border border-rose-500/30">
            <AlertTriangle className="h-3 w-3" />
            Inadimplente
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-text-muted">
            Sem contrato
          </span>
        );
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-surface-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-white/10 bg-surface-canvas/60 text-text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Cliente / Delivery</th>
              <th className="px-4 py-3 font-semibold">Plano Contratado</th>
              <th className="px-4 py-3 font-semibold">MRR Contábil</th>
              <th className="px-4 py-3 font-semibold">Mídia Meta Ads</th>
              <th className="px-4 py-3 font-semibold">Vencimento</th>
              <th className="px-4 py-3 font-semibold">Status de Cobrança</th>
              <th className="px-4 py-3 font-semibold text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-text-primary">
            {items.map(({ client, contract }) => {
              const isTrimestral = contract?.cycle === 'TRIMESTRAL';
              const daysOverdue = contract?.daysOverdue || 0;
              const isAtRisk = contract?.isAtRisk || false;

              return (
                <tr
                  key={client.id}
                  className={`transition-colors hover:bg-white/[0.02] ${
                    isAtRisk ? 'bg-rose-500/5' : ''
                  }`}
                >
                  {/* Cliente / Delivery */}
                  <td className="px-4 py-3">
                    <Link
                      href={`/clients/${client.id}`}
                      className="group flex items-center gap-2"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-text-muted group-hover:text-brand transition-colors">
                        <Store className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div className="font-bold text-text-primary group-hover:text-brand transition-colors flex items-center gap-1.5">
                          <span>{client.deliveryNome}</span>
                          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="text-[11px] text-text-muted">
                          {client.nome} • {client.cidade}
                        </div>
                      </div>
                    </Link>
                  </td>

                  {/* Plano */}
                  <td className="px-4 py-3">
                    {contract ? (
                      <div>
                        <span
                          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            isTrimestral
                              ? 'bg-brand/15 text-brand border border-brand/30'
                              : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                          }`}
                        >
                          {isTrimestral ? 'Trimestral' : 'Mensal'}
                        </span>
                        <div className="mt-0.5 text-[11px] text-text-muted tabular-nums">
                          Total: {formatCurrency(contract.totalValue)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-text-muted text-[11px]">Pendente</span>
                    )}
                  </td>

                  {/* MRR Contábil */}
                  <td className="px-4 py-3 font-bold text-text-primary tabular-nums">
                    {formatCurrency(contract?.mrrEquivalent)}
                  </td>

                  {/* Mídia Meta Ads */}
                  <td className="px-4 py-3 text-text-muted tabular-nums">
                    {formatCurrency(contract?.mediaBudget)}/mês
                  </td>

                  {/* Vencimento */}
                  <td className="px-4 py-3">
                    {contract ? (
                      <div>
                        <span className="font-semibold text-text-primary">
                          Dia {contract.dueDay}
                        </span>
                        {daysOverdue > 0 && (
                          <div className="text-[10px] font-bold text-rose-400">
                            {daysOverdue} dias de atraso
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-text-muted">-</span>
                    )}
                  </td>

                  {/* Status de Cobrança com Seletor Rápido */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(contract?.paymentStatus, isAtRisk)}

                      {contract && (
                        <select
                          value={contract.paymentStatus}
                          onChange={(e) =>
                            onUpdatePaymentStatus(
                              client.id,
                              e.target.value as PaymentStatus
                            )
                          }
                          className="rounded border border-white/10 bg-surface-canvas px-1.5 py-0.5 text-[10px] text-text-muted hover:text-text-primary focus:outline-none"
                        >
                          <option value="EM_DIA">Em dia</option>
                          <option value="PENDENTE">Pendente</option>
                          <option value="INADIMPLENTE">Inadimplente</option>
                        </select>
                      )}
                    </div>
                  </td>

                  {/* Ações */}
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onEditContract(client)}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-surface-canvas px-2.5 py-1 text-[11px] font-semibold text-text-muted hover:border-white/20 hover:text-text-primary transition-all"
                    >
                      <Edit className="h-3 w-3" />
                      <span>{contract ? 'Editar' : 'Criar Contrato'}</span>
                    </button>
                  </td>
                </tr>
              );
            })}

            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-text-muted">
                  Nenhum cliente ou contrato encontrado com os filtros atuais.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
