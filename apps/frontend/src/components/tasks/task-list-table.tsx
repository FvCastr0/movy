'use client';

import React from 'react';
import { Task, TaskPriority, TaskStatus } from '@/types';
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Trash2,
  User,
  Building2,
  Calendar,
  Layers,
} from 'lucide-react';

interface TaskListTableProps {
  tasks: Task[];
  currentUserId?: string;
  isAdmin?: boolean;
  onToggleStatus: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export function TaskListTable({
  tasks,
  currentUserId,
  isAdmin,
  onToggleStatus,
  onDeleteTask,
}: TaskListTableProps) {
  const formatDueDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isPast = date < today;
    const formatted = date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });

    return {
      formatted,
      isPast,
    };
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'URGENTE':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-400 border border-rose-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-ping" />
            Urgente
          </span>
        );
      case 'ALTA':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/30">
            Alta
          </span>
        );
      case 'MEDIA':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-400 border border-blue-500/30">
            Média
          </span>
        );
      case 'BAIXA':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-400 border border-white/5">
            Baixa
          </span>
        );
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-surface-card p-12 text-center space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-text-muted">
          <Layers className="h-6 w-6" />
        </div>
        <h4 className="text-sm font-bold text-text-primary">Nenhuma demanda encontrada</h4>
        <p className="text-xs text-text-muted max-w-sm mx-auto">
          Você não possui nenhuma demanda pendente neste filtro. Clique em "+ Nova Demanda" para registrar uma nova tarefa ou lembrete.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {tasks.map((task) => {
        const isDone = task.status === 'CONCLUIDA';
        const dueInfo = formatDueDate(task.dueDate);
        const canDelete = isAdmin || task.createdById === currentUserId;

        return (
          <div
            key={task.id}
            className={`group rounded-xl border p-4 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
              isDone
                ? 'border-white/5 bg-surface-canvas/50 opacity-60'
                : 'border-white/10 bg-surface-card hover:border-white/20 hover:shadow-lg'
            }`}
          >
            {/* Lado Esquerdo: Checkbox + Título + Detalhes */}
            <div className="flex items-start gap-3 min-w-0">
              <button
                type="button"
                onClick={() => onToggleStatus(task)}
                className="mt-0.5 shrink-0 text-text-muted hover:text-brand transition-colors"
                title={isDone ? 'Reabrir demanda' : 'Marcar como concluída'}
              >
                {isDone ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                ) : (
                  <Circle className="h-5 w-5 hover:border-brand" />
                )}
              </button>

              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4
                    className={`text-xs font-bold ${
                      isDone ? 'line-through text-text-muted' : 'text-text-primary'
                    }`}
                  >
                    {task.title}
                  </h4>
                  {getPriorityBadge(task.priority)}
                  {task.status === 'EM_ANDAMENTO' && (
                    <span className="rounded-full bg-brand/10 border border-brand/20 px-2 py-0.5 text-[9px] font-bold text-brand">
                      Em Andamento
                    </span>
                  )}
                </div>

                {task.description && (
                  <p className="text-[11px] text-text-muted leading-relaxed line-clamp-2">
                    {task.description}
                  </p>
                )}

                {/* Metadados: Responsável, Criador, Vínculo */}
                <div className="flex items-center gap-3 text-[10px] text-text-muted pt-0.5 flex-wrap">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-brand" />
                    Responsável: <strong className="text-text-primary">{task.assignedTo?.name || 'Membro'}</strong>
                  </span>

                  {task.createdById !== task.assignedToId && (
                    <span className="text-text-muted">
                      (Delegado por {task.createdBy?.name || 'Admin'})
                    </span>
                  )}

                  {task.client && (
                    <span className="flex items-center gap-1 text-text-primary">
                      <Building2 className="w-3 h-3 text-text-muted" />
                      {task.client.deliveryNome}
                    </span>
                  )}

                  {task.lead && (
                    <span className="flex items-center gap-1 text-text-primary">
                      <Building2 className="w-3 h-3 text-text-muted" />
                      Lead: {task.lead.deliveryNome}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Lado Direito: Prazo e Excluir */}
            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
              {dueInfo && (
                <div
                  className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg border ${
                    isDone
                      ? 'text-text-muted border-white/5'
                      : dueInfo.isPast
                      ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                      : 'text-text-secondary bg-white/5 border-white/10'
                  }`}
                  title={dueInfo.isPast ? 'Demanda com prazo vencido!' : 'Prazo de conclusão'}
                >
                  {dueInfo.isPast && !isDone ? (
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                  ) : (
                    <Calendar className="w-3 h-3 text-text-muted" />
                  )}
                  <span>{dueInfo.formatted}</span>
                </div>
              )}

              {canDelete && (
                <button
                  type="button"
                  onClick={() => onDeleteTask(task.id)}
                  className="p-1.5 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Excluir demanda"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
