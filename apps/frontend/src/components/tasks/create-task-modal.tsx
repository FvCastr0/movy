'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, Calendar, AlertCircle, User, Flag, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { Task, TaskPriority, TaskUserRef } from '@/types';
import { getCurrentUser } from '@/lib/auth';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newTask: Task) => void;
}

export function CreateTaskModal({ isOpen, onClose, onSuccess }: CreateTaskModalProps) {
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === 'ADMIN';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIA');
  const [dueDate, setDueDate] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [assignableUsers, setAssignableUsers] = useState<TaskUserRef[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setPriority('MEDIA');
      setDueDate('');
      setError(null);
      setAssignedToId(currentUser?.id || '');

      // Se for Admin, carrega os membros da equipe para delegar
      if (isAdmin) {
        api.get<TaskUserRef[]>('/tasks/assignable-users')
          .then((res) => {
            setAssignableUsers(res.data);
            if (!assignedToId && res.data.length > 0) {
              setAssignedToId(currentUser?.id || res.data[0].id);
            }
          })
          .catch(() => {});
      }
    }
  }, [isOpen, isAdmin, currentUser?.id]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Por favor, informe o título da demanda.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      };

      if (isAdmin && assignedToId) {
        payload.assignedToId = assignedToId;
      }

      const res = await api.post<Task>('/tasks', payload);
      onSuccess(res.data);
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Falha ao registrar a demanda no servidor.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-surface-card p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/15 text-brand border border-brand/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">Nova Demanda</h3>
              <p className="text-xs text-text-muted">
                {isAdmin ? 'Crie para você ou delegue para um membro da equipe' : 'Registre um lembrete ou demanda pessoal'}
              </p>
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

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Título da Demanda *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Confirmar fechamento com Delivery Sabor & Brasa"
              className="w-full rounded-xl border border-white/10 bg-surface-canvas p-2.5 text-xs text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Descrição / Detalhes (Opcional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o que precisa ser feito, dados de contato ou links de apoio..."
              className="w-full rounded-xl border border-white/10 bg-surface-canvas p-2.5 text-xs text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1 flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5 text-text-muted" />
                Prioridade
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full rounded-xl border border-white/10 bg-surface-canvas p-2.5 text-xs text-text-primary focus:border-brand focus:outline-none"
              >
                <option value="BAIXA">🟢 Baixa</option>
                <option value="MEDIA">🟡 Média</option>
                <option value="ALTA">🟠 Alta</option>
                <option value="URGENTE">🔴 Urgente</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-text-muted" />
                Data Limite / Prazo
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-surface-canvas p-2.5 text-xs text-text-primary focus:border-brand focus:outline-none"
              >
              </input>
            </div>
          </div>

          {isAdmin && (
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-brand" />
                Delegar para Membro da Equipe
              </label>
              <select
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-surface-canvas p-2.5 text-xs text-text-primary focus:border-brand focus:outline-none"
              >
                {assignableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role}) {u.id === currentUser?.id ? '— (Eu)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

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
              disabled={isSubmitting || !title.trim()}
              className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white shadow-md shadow-brand/20 hover:bg-brand-hover transition-colors disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              <span>{isSubmitting ? 'Criando...' : 'Criar Demanda'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
