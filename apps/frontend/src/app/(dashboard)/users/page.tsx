'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { SystemUser, UserRole } from '@/types';
import {
  Users as UsersIcon,
  UserPlus,
  ShieldCheck,
  Briefcase,
  TrendingUp,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
  Lock,
  Mail,
  User,
  ShieldAlert,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';

const ROLE_CONFIG: Record<
  UserRole,
  { label: string; badgeClass: string; description: string }
> = {
  ADMIN: {
    label: 'Administrador',
    badgeClass: 'bg-brand/15 text-brand border-brand/30',
    description: 'Acesso irrestrito a todas as áreas, finanças e gestão de usuários.',
  },
  SDR: {
    label: 'SDR (Prospecção)',
    badgeClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    description: 'Acesso a Leads e CRM Comercial para qualificação e prospecção.',
  },
  CLOSER: {
    label: 'Closer (Vendas)',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    description: 'Acesso a reuniões agendadas, propostas e fechamentos no CRM.',
  },
  GESTOR: {
    label: 'Gestor de Tráfego',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    description: 'Acesso a clientes ativos, sincronização Meta Ads e emissão de relatórios.',
  },
};

export default function UsersManagementPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal de Criação de Usuário
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('SDR');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadUsers = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setIsLoading(true);
      else setIsRefreshing(true);
      setError(null);
      const res = await api.get<SystemUser[]>('/users');
      setUsers(res.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao carregar colaboradores do sistema.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const u = getCurrentUser();
    setCurrentUser(u);
    setMounted(true);
    if (u?.role === 'ADMIN') {
      loadUsers();
    }
  }, [loadUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSubmitting(true);

    try {
      await api.post('/users', {
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      });

      alert(`Colaborador ${name} cadastrado com sucesso com perfil ${ROLE_CONFIG[role].label}!`);
      setName('');
      setEmail('');
      setPassword('');
      setRole('SDR');
      setIsModalOpen(false);
      await loadUsers(true);
    } catch (err: any) {
      setModalError(err?.response?.data?.message || 'Não foi possível cadastrar o colaborador.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userToDelete: SystemUser) => {
    if (userToDelete.id === currentUser?.id) {
      alert('Você não pode excluir a sua própria conta de administrador.');
      return;
    }

    if (!window.confirm(`Deseja realmente remover o colaborador "${userToDelete.name}" (${userToDelete.email})?`)) {
      return;
    }

    try {
      await api.delete(`/users/${userToDelete.id}`);
      await loadUsers(true);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Falha ao remover colaborador.');
    }
  };

  // Bloqueio de acesso para não-administradores
  if (mounted && currentUser && currentUser.role !== 'ADMIN') {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
        <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-text-primary">Acesso Restrito ao Administrador</h2>
        <p className="mt-1 text-xs text-text-muted max-w-md">
          Apenas administradores possuem permissão para gerenciar e criar colaboradores no sistema da MOVY.
        </p>
        <Link
          href="/crm"
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-semibold shadow-md shadow-brand/20 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para o CRM Comercial
        </Link>
      </div>
    );
  }

  // Contadores
  const totalCount = users.length;
  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const sdrCount = users.filter((u) => u.role === 'SDR').length;
  const closerCount = users.filter((u) => u.role === 'CLOSER').length;
  const gestorCount = users.filter((u) => u.role === 'GESTOR').length;

  return (
    <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-brand/10 text-brand border border-brand/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-text-primary">
              Gestão de Usuários & Permissões
            </h1>
          </div>
          <p className="mt-0.5 text-xs text-text-muted">
            Cadastre e controle os papéis operacionais da MOVY (Administradores, SDRs, Closers e Gestores).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadUsers(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-surface-card px-3 py-2 text-xs font-semibold text-text-muted hover:bg-white/5 hover:text-text-primary transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-bold shadow-md shadow-brand/20 active:scale-95 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Novo Colaborador</span>
          </button>
        </div>
      </div>

      {/* KPI Cards de Colaboradores */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl border border-white/5 bg-surface-card space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Total Ativo
          </span>
          <div className="text-xl font-bold text-text-primary">{totalCount}</div>
        </div>

        <div className="p-4 rounded-xl border border-white/5 bg-surface-card space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-brand">
            Admins
          </span>
          <div className="text-xl font-bold text-brand">{adminCount}</div>
        </div>

        <div className="p-4 rounded-xl border border-white/5 bg-surface-card space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-400">
            SDRs
          </span>
          <div className="text-xl font-bold text-sky-400">{sdrCount}</div>
        </div>

        <div className="p-4 rounded-xl border border-white/5 bg-surface-card space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
            Closers
          </span>
          <div className="text-xl font-bold text-emerald-400">{closerCount}</div>
        </div>

        <div className="p-4 rounded-xl border border-white/5 bg-surface-card space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">
            Gestores
          </span>
          <div className="text-xl font-bold text-amber-400">{gestorCount}</div>
        </div>
      </div>

      {/* Feedback de Erro */}
      {error && (
        <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabela de Colaboradores */}
      <div className="rounded-2xl border border-white/10 bg-surface-card overflow-hidden shadow-sm">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
            Colaboradores Cadastrados ({users.length})
          </h3>
          <span className="text-[11px] text-text-muted">
            Somente Admins podem criar e gerenciar acessos
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            <p className="mt-3 text-xs text-text-muted">Carregando lista de colaboradores...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-text-muted text-xs">
            Nenhum colaborador encontrado além do seu usuário.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.02] text-text-muted border-b border-white/5">
                <tr>
                  <th className="py-3 px-4 font-semibold">Nome</th>
                  <th className="py-3 px-4 font-semibold">E-mail</th>
                  <th className="py-3 px-4 font-semibold">Papel / Função</th>
                  <th className="py-3 px-4 font-semibold">Data Cadastro</th>
                  <th className="py-3 px-4 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-text-primary">
                {users.map((u) => {
                  const roleMeta = ROLE_CONFIG[u.role] || {
                    label: u.role,
                    badgeClass: 'bg-white/10 text-zinc-300 border-white/20',
                  };
                  const isCurrent = u.id === currentUser?.id;

                  return (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 font-semibold flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text-muted text-[11px] font-bold">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span>{u.name}</span>
                          {isCurrent && (
                            <span className="ml-1.5 text-[10px] text-brand font-medium">
                              (Você)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-text-muted font-mono text-[11px]">{u.email}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${roleMeta.badgeClass}`}
                        >
                          {roleMeta.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-text-muted text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            className="p-1 text-text-muted hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Remover colaborador"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Criação de Usuário */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-surface-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-brand/10 text-brand">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-text-primary text-base">Novo Colaborador</h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Defina credenciais e a função no sistema
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-text-muted hover:text-text-primary rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1">
                  Nome Completo <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-text-muted absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Eduardo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-surface-canvas border border-white/10 rounded-lg text-text-primary focus:border-brand focus:outline-none placeholder:text-text-muted/60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1">
                  E-mail de Acesso <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-text-muted absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="carlos@movy.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-surface-canvas border border-white/10 rounded-lg text-text-primary focus:border-brand focus:outline-none placeholder:text-text-muted/60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1">
                  Senha Provisória (Mínimo 6 caracteres) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-text-muted absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-surface-canvas border border-white/10 rounded-lg text-text-primary focus:border-brand focus:outline-none placeholder:text-text-muted/60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1">
                  Papel / Função Operacional <span className="text-rose-400">*</span>
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-xs bg-surface-canvas border border-white/10 rounded-lg text-text-primary focus:border-brand focus:outline-none"
                >
                  <option value="SDR">SDR (Qualificação & Prospecção de Leads)</option>
                  <option value="CLOSER">Closer (Apresentação de Reuniões & Vendas)</option>
                  <option value="GESTOR">Gestor de Tráfego (Clientes & Meta Ads)</option>
                  <option value="ADMIN">Administrador Geral (Acesso Total & Finanças)</option>
                </select>
                <p className="mt-1 text-[11px] text-text-muted">
                  {ROLE_CONFIG[role].description}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-text-muted bg-surface-canvas hover:bg-white/5 rounded-lg transition-colors border border-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-brand hover:bg-brand-hover disabled:opacity-50 rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-md shadow-brand/20 active:scale-95"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Cadastrando...' : 'Cadastrar Colaborador'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
