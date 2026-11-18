'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Expense, ExpenseCategory } from '@/types';
import { X, DollarSign, Calendar, Tag, AlertCircle, Repeat, CheckCircle } from 'lucide-react';

interface ExpenseManagerModalProps {
  isOpen: boolean;
  expenseToEdit?: Expense | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ExpenseManagerModal({
  isOpen,
  expenseToEdit,
  onClose,
  onSuccess,
}: ExpenseManagerModalProps) {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('EQUIPE');
  const [amount, setAmount] = useState<number | ''>('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [isRecurring, setIsRecurring] = useState(true);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (expenseToEdit) {
      setDescription(expenseToEdit.description);
      setCategory(expenseToEdit.category);
      setAmount(expenseToEdit.amount);
      setDueDate(new Date(expenseToEdit.dueDate).toISOString().split('T')[0]);
      setIsRecurring(expenseToEdit.isRecurring);
      setNotes(expenseToEdit.notes || '');
    } else {
      setDescription('');
      setCategory('EQUIPE');
      setAmount('');
      setDueDate(new Date().toISOString().split('T')[0]);
      setIsRecurring(true);
      setNotes('');
    }
    setErrorMessage(null);
  }, [expenseToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMessage('Por favor, informe a descrição da despesa.');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setErrorMessage('Informe um valor monetário válido.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        description: description.trim(),
        category,
        amount: Number(amount),
        dueDate,
        isRecurring,
        notes: notes.trim() || undefined,
      };

      if (expenseToEdit) {
        await api.patch(`/finance/expenses/${expenseToEdit.id}`, payload);
      } else {
        await api.post('/finance/expenses', payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Erro ao salvar despesa. Verifique os dados.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-surface-card p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h2 className="text-base font-bold text-text-primary">
              {expenseToEdit ? 'Editar Despesa da Agência' : 'Cadastrar Nova Despesa'}
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Controle de saídas operacionais (Equipe, Softwares e Marketing)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-muted hover:bg-white/5 hover:text-text-primary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Descrição */}
          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1">
              Descrição do Gasto
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Salário Gestor de Tráfego, Zapier, Google Workspace..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-surface-canvas px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
            />
          </div>

          {/* Categoria & Valor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">
                Categoria
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-muted" />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full rounded-lg border border-white/10 bg-surface-canvas pl-9 pr-3 py-2 text-xs text-text-primary focus:border-brand focus:outline-none"
                >
                  <option value="EQUIPE">Equipe / Prestadores PJ</option>
                  <option value="FERRAMENTAS_SAAS">Ferramentas & Softwares</option>
                  <option value="MARKETING_PROPRIO">Marketing Próprio (Mídia)</option>
                  <option value="OUTROS">Outras Despesas</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">
                Valor (R$)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-muted" />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full rounded-lg border border-white/10 bg-surface-canvas pl-9 pr-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Vencimento e Recorrência */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">
                Data de Vencimento / Pagamento
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-muted" />
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-surface-canvas pl-9 pr-3 py-2 text-xs text-text-primary focus:border-brand focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center pt-5">
              <label className="relative flex cursor-pointer items-center gap-2 select-none">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-surface-canvas text-brand focus:ring-brand"
                />
                <span className="flex items-center gap-1.5 text-xs font-medium text-text-primary">
                  <Repeat className="h-3.5 w-3.5 text-brand" />
                  Despesa Recorrente Fixa (mensal)
                </span>
              </label>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1">
              Observações (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Pagamento no dia 05 via Pix chave CNPJ..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-surface-canvas px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-white/10 px-4 py-2 text-xs font-medium text-text-muted hover:bg-white/5 hover:text-text-primary transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand/90 transition-colors disabled:opacity-50"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              <span>{isSubmitting ? 'Salvando...' : expenseToEdit ? 'Atualizar' : 'Salvar Despesa'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
