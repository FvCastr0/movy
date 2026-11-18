'use client';

import React from 'react';
import { MonthlyClosingSummary } from '@/types';
import { FileText, ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface DreStatementTableProps {
  data: MonthlyClosingSummary | null;
  isLoading: boolean;
}

export function DreStatementTable({ data, isLoading }: DreStatementTableProps) {
  if (isLoading || !data) {
    return null;
  }

  const periods = data.periods;
  if (periods.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-surface-card p-6 shadow-sm">
      <div className="flex items-center gap-2 border-b border-white/10 pb-4">
        <FileText className="h-4 w-4 text-brand" />
        <div>
          <h3 className="text-sm font-bold text-text-primary">
            Demonstrativo do Resultado do Exercício (DRE Gerencial)
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Visão contábil detalhada linha a linha da operação da Movy
          </p>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] font-semibold text-text-muted uppercase">
              <th className="py-3 px-4 min-w-[200px]">Linha de Resultado</th>
              {periods.map((p) => (
                <th key={p.monthKey} className="py-3 px-4 text-right min-w-[120px]">
                  {p.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-text-primary">
            {/* Receita por Competência */}
            <tr className="hover:bg-white/[0.02]">
              <td className="py-2.5 px-4 font-semibold text-emerald-400">
                (+) Receita Operacional Bruta (MRR)
              </td>
              {periods.map((p) => (
                <td key={p.monthKey} className="py-2.5 px-4 text-right font-medium text-emerald-400">
                  R$ {p.revenue.mrrRecognized.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
              ))}
            </tr>

            {/* Entrada em Caixa */}
            <tr className="hover:bg-white/[0.02] text-text-muted">
              <td className="py-2 px-4 pl-6 text-[11px]">
                └ Entrada Real em Caixa (Recebimentos)
              </td>
              {periods.map((p) => (
                <td key={p.monthKey} className="py-2 px-4 text-right text-[11px]">
                  R$ {p.revenue.cashInflow.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
              ))}
            </tr>

            {/* COGS Clientes */}
            <tr className="hover:bg-white/[0.02] text-text-muted">
              <td className="py-2.5 px-4 text-rose-300">
                (-) Custos Operacionais Diretos (COGS Clientes)
              </td>
              {periods.map((p) => (
                <td key={p.monthKey} className="py-2.5 px-4 text-right text-rose-300">
                  - R$ {p.cogsClients.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
              ))}
            </tr>

            {/* Margem Bruta */}
            <tr className="border-t border-b border-white/10 bg-white/[0.01]">
              <td className="py-2.5 px-4 font-semibold text-text-primary">
                (=) Lucro Bruto Operacional
              </td>
              {periods.map((p) => {
                const gross = p.revenue.mrrRecognized - p.cogsClients;
                return (
                  <td key={p.monthKey} className="py-2.5 px-4 text-right font-semibold text-text-primary">
                    R$ {gross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                );
              })}
            </tr>

            {/* Despesas com Pessoal */}
            <tr className="hover:bg-white/[0.02] text-text-muted">
              <td className="py-2 px-4 pl-6">
                (-) Equipe & Prestadores PJ
              </td>
              {periods.map((p) => (
                <td key={p.monthKey} className="py-2 px-4 text-right text-rose-400/80">
                  - R$ {p.expenses.team.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
              ))}
            </tr>

            {/* Ferramentas SaaS */}
            <tr className="hover:bg-white/[0.02] text-text-muted">
              <td className="py-2 px-4 pl-6">
                (-) Softwares, CRM & Ferramentas SaaS
              </td>
              {periods.map((p) => (
                <td key={p.monthKey} className="py-2 px-4 text-right text-rose-400/80">
                  - R$ {p.expenses.tools.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
              ))}
            </tr>

            {/* Marketing Próprio */}
            <tr className="hover:bg-white/[0.02] text-text-muted">
              <td className="py-2 px-4 pl-6">
                (-) Marketing Próprio (Mídia Movy)
              </td>
              {periods.map((p) => (
                <td key={p.monthKey} className="py-2 px-4 text-right text-rose-400/80">
                  - R$ {p.expenses.marketing.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
              ))}
            </tr>

            {/* Outros */}
            <tr className="hover:bg-white/[0.02] text-text-muted">
              <td className="py-2 px-4 pl-6">
                (-) Outras Despesas Operacionais
              </td>
              {periods.map((p) => (
                <td key={p.monthKey} className="py-2 px-4 text-right text-rose-400/80">
                  - R$ {p.expenses.others.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
              ))}
            </tr>

            {/* Total Despesas */}
            <tr className="border-t border-white/5 text-rose-400">
              <td className="py-2.5 px-4 font-medium">
                (=) Total de Despesas Administrativas
              </td>
              {periods.map((p) => (
                <td key={p.monthKey} className="py-2.5 px-4 text-right font-semibold">
                  - R$ {p.expenses.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
              ))}
            </tr>

            {/* Lucro Líquido */}
            <tr className="border-t-2 border-white/20 bg-white/[0.03]">
              <td className="py-3 px-4 font-bold text-text-primary text-sm">
                (=) Lucro Operacional Líquido
              </td>
              {periods.map((p) => (
                <td
                  key={p.monthKey}
                  className={`py-3 px-4 text-right font-bold text-sm ${
                    p.netProfitCompetence >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  R$ {p.netProfitCompetence.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
              ))}
            </tr>

            {/* Margem Líquida % */}
            <tr className="bg-white/[0.01]">
              <td className="py-2 px-4 font-semibold text-text-muted text-[11px]">
                (%) Margem Líquida Real
              </td>
              {periods.map((p) => (
                <td
                  key={p.monthKey}
                  className={`py-2 px-4 text-right font-semibold text-[11px] ${
                    p.netMarginPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {p.netMarginPercent}%
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
