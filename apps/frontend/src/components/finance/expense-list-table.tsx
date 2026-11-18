'use client';

import React, { useState } from 'react';
import { Expense, ExpenseCategory } from '@/types';
import {
  Users,
  Cpu,
  Megaphone,
  MoreHorizontal,
  Plus,
  Repeat,
  Trash2,
  Edit2,
  Calendar,
  DollarSign,
  Layers,
} from 'lucide-react';

interface ExpenseListTableProps {
  expenses: Expense[];
  isLoading: boolean;
  onOpenCreateModal: () => void;
  onOpenEditModal: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
}

export function ExpenseListTable({
  expenses,
  isLoading,
  onOpenCreateModal,
  onOpenEditModal,
  onDeleteExpense,
}: ExpenseListTableProps) {
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | ExpenseCategory>('ALL');

  const filteredExpenses = expenses.filter((e) => {
    if (selectedCategory === 'ALL') return true;
    return e.category === selectedCategory;
  });

  const totalMonthlyExpenses = expenses
    .filter((e) => e.isActive)
    .reduce((acc, curr) => acc + curr.amount, 0);

  const getCategoryBadge = (category: ExpenseCategory) => {
    switch (category) {
      case 'EQUIPE':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-medium text-blue-400 border border-blue-500/20">
            <Users className="h-3 w-3" />
            Equipe / Prestador
          </span>
        );
      case 'FERRAMENTAS_SAAS':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-medium text-purple-400 border border-purple-500/20">
            <Cpu className="h-3 w-3" />
            SaaS & Software
          </span>
        );
      case 'MARKETING_PROPRIO':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-400 border border-amber-500/20">
            <Megaphone className="h-3 w-3" />
            Mídia Própria
          </span>
        );
      case 'OUTROS':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2.5 py-0.5 text-[11px] font-medium text-slate-400 border border-slate-500/20">
            <MoreHorizontal className="h-3 w-3" />
            Outros
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Barra de Ações & Resumo */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-white/10 bg-surface-card p-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-text-primary">
              Despesas Operacionais da Agência
            </h3>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-text-muted">
              {filteredExpenses.length} cadastradas
            </span>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Total mensal ativo estimado:{' '}
            <strong className="text-rose-400 font-semibold">
              R$ {totalMonthlyExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtros de Categoria */}
          <div className="flex items-center rounded-lg border border-white/10 bg-surface-canvas p-1">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                selectedCategory === 'ALL'
                  ? 'bg-white/10 text-text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('EQUIPE')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                selectedCategory === 'EQUIPE'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Equipe
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('FERRAMENTAS_SAAS')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                selectedCategory === 'FERRAMENTAS_SAAS'
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              SaaS
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('MARKETING_PROPRIO')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                selectedCategory === 'MARKETING_PROPRIO'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Marketing
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand/90 transition-colors shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Nova Despesa</span>
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-surface-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                <th className="py-3 px-4">Descrição</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Vencimento</th>
                <th className="py-3 px-4 text-right">Valor</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-text-primary">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-muted">
                    Carregando despesas da agência...
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-muted">
                    Nenhuma despesa encontrada nesta categoria. Clique em "Nova Despesa" para cadastrar.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => {
                  const dueDateFormatted = new Date(expense.dueDate).toLocaleDateString('pt-BR');
                  return (
                    <tr
                      key={expense.id}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-medium">
                        <div className="flex flex-col">
                          <span>{expense.description}</span>
                          {expense.notes && (
                            <span className="text-[11px] text-text-muted mt-0.5 line-clamp-1">
                              {expense.notes}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">{getCategoryBadge(expense.category)}</td>
                      <td className="py-3.5 px-4">
                        {expense.isRecurring ? (
                          <span className="inline-flex items-center gap-1 rounded bg-white/5 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                            <Repeat className="h-3 w-3" />
                            Recorrente Mensal
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-white/5 px-2 py-0.5 text-[11px] font-medium text-text-muted">
                            Pontual
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-text-muted">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{dueDateFormatted}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-rose-400">
                        R$ {expense.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onOpenEditModal(expense)}
                            title="Editar despesa"
                            className="rounded p-1.5 text-text-muted hover:bg-white/10 hover:text-text-primary transition-colors"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Deseja inativar a despesa "${expense.description}"?`)) {
                                onDeleteExpense(expense.id);
                              }
                            }}
                            title="Inativar despesa"
                            className="rounded p-1.5 text-text-muted hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
