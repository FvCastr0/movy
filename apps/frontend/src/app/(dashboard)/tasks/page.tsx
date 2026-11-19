'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Task, TaskPriority, TaskStatus } from '@/types';
import { getCurrentUser, AuthUser } from '@/lib/auth';
import { TaskListTable } from '@/components/tasks/task-list-table';
import { CreateTaskModal } from '@/components/tasks/create-task-modal';
import {
  CheckSquare,
  Plus,
  RefreshCw,
  AlertCircle,
  Clock,
  Layers,
  Filter,
} from 'lucide-react';

export default function TasksPage() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filtros
  const [scope, setScope] = useState<'my' | 'assigned_by_me' | 'all'>('my');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TaskStatus>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | TaskPriority>('ALL');

  // Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  const isAdmin = currentUser?.role === 'ADMIN';

  const fetchTasks = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setErrorMessage(null);

    try {
      const params = new URLSearchParams();
      params.append('scope', scope);

      if (statusFilter !== 'ALL') {
        params.append('status', statusFilter);
      }

      if (priorityFilter !== 'ALL') {
        params.append('priority', priorityFilter);
      }

      const res = await api.get<Task[]>(`/tasks?${params.toString()}`);
      setTasks(res.data);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Falha ao carregar lista de demandas.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [scope, statusFilter, priorityFilter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleToggleStatus = async (task: Task) => {
    const newStatus: TaskStatus = task.status === 'CONCLUIDA' ? 'PENDENTE' : 'CONCLUIDA';
    
    // Atualização otimista local imediata
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );

    try {
      await api.patch(`/tasks/${task.id}`, { status: newStatus });
    } catch {
      alert('Não foi possível atualizar o status da demanda.');
      fetchTasks(true);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Deseja realmente excluir esta demanda?')) return;

    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    try {
      await api.delete(`/tasks/${taskId}`);
    } catch {
      alert('Falha ao excluir demanda.');
      fetchTasks(true);
    }
  };

  // Métricas rápidas
  const pendingCount = tasks.filter((t) => t.status !== 'CONCLUIDA').length;
  const urgentCount = tasks.filter((t) => t.priority === 'URGENTE' && t.status !== 'CONCLUIDA').length;
  const completedCount = tasks.filter((t) => t.status === 'CONCLUIDA').length;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 space-y-6">
      {/* Topo / Header da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-text-primary flex items-center gap-2.5">
              <CheckSquare className="w-6 h-6 text-brand" />
              Central de Demandas
            </h1>
            <span className="rounded-full bg-brand/10 border border-brand/20 px-2.5 py-0.5 text-xs font-bold text-brand">
              {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            {isAdmin
              ? 'Atribua demandas para a equipe, acompanhe prazos e gerencie pendências internas'
              : 'Gerencie suas tarefas diárias, lembretes operacionais e demandas comerciais'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchTasks(true)}
            disabled={isRefreshing || isLoading}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-surface-card text-text-muted hover:text-text-primary hover:border-white/20 transition-all active:scale-95 disabled:opacity-50"
            title="Atualizar demandas"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-brand' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white shadow-lg shadow-brand/20 hover:bg-brand-hover active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Demanda</span>
          </button>
        </div>
      </div>

      {/* Cards de Resumo Rápido */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/10 bg-surface-card p-4 space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            Demandas Pendentes
          </span>
          <p className="text-xl font-bold text-text-primary">{pendingCount}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-surface-card p-4 space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            Urgências Não Resolvidas
          </span>
          <p className="text-xl font-bold text-rose-400">{urgentCount}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-surface-card p-4 space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
            Demandas Concluídas
          </span>
          <p className="text-xl font-bold text-emerald-400">{completedCount}</p>
        </div>
      </div>

      {/* Abas de Escopo & Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-white/10">
        {/* Abas */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-canvas border border-white/10 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setScope('my')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              scope === 'my'
                ? 'bg-brand text-white shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Minhas Demandas
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setScope('assigned_by_me')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                scope === 'assigned_by_me'
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Delegadas por Mim
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                scope === 'all'
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Todas da Agência
            </button>
          )}
        </div>

        {/* Filtros de Status e Prioridade */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-text-muted" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="rounded-lg border border-white/10 bg-surface-card px-2.5 py-1.5 text-xs text-text-primary focus:border-brand focus:outline-none"
            >
              <option value="ALL">Status: Todos</option>
              <option value="PENDENTE">Pendentes</option>
              <option value="EM_ANDAMENTO">Em Andamento</option>
              <option value="CONCLUIDA">Concluídas</option>
            </select>
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="rounded-lg border border-white/10 bg-surface-card px-2.5 py-1.5 text-xs text-text-primary focus:border-brand focus:outline-none"
          >
            <option value="ALL">Prioridade: Todas</option>
            <option value="URGENTE">Urgente</option>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Média</option>
            <option value="BAIXA">Baixa</option>
          </select>
        </div>
      </div>

      {/* Conteúdo Principal / Listagem */}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>
      ) : (
        <TaskListTable
          tasks={tasks}
          currentUserId={currentUser?.id}
          isAdmin={isAdmin}
          onToggleStatus={handleToggleStatus}
          onDeleteTask={handleDeleteTask}
        />
      )}

      {/* Modal de Nova Demanda */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => fetchTasks(true)}
      />
    </div>
  );
}
