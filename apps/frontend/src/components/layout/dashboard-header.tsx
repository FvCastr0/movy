'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentUser, clearSession, AuthUser } from '@/lib/auth';
import { LayoutGrid, Table, LogOut, Shield, RefreshCw, Users, UserCheck, Briefcase, CircleDollarSign } from 'lucide-react';

interface DashboardHeaderProps {
  viewMode?: 'kanban' | 'table';
  onViewModeChange?: (mode: 'kanban' | 'table') => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function DashboardHeader({
  viewMode = 'kanban',
  onViewModeChange,
  onRefresh,
  isRefreshing = false,
}: DashboardHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  const handleLogout = () => {
    clearSession();
    router.push('/login');
  };

  const isLeadsPage = pathname === '/leads' || pathname === '/leads/';

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-surface-canvas/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">

        {/* Lado Direito: Ações & Perfil */}
        <div className="flex items-center gap-3">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Atualizar dados"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-surface-card text-text-secondary hover:text-text-primary hover:border-white/20 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-brand' : ''}`} />
            </button>
          )}

          {/* Usuário Logado */}
          <div className="flex items-center gap-2 pl-3 border-l border-white/10">
            <div className="hidden sm:block text-right">
              <div className="text-xs font-semibold text-text-primary">
                {user?.name || 'Assessor SDR'}
              </div>
              <div className="text-[10px] text-text-muted flex items-center justify-end gap-1">
                <Shield className="h-2.5 w-2.5 text-status-success" />
                {user?.role || 'ADMIN'}
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title="Encerrar sessão"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-surface-card text-text-muted hover:text-status-danger hover:border-status-danger/30 transition-all active:scale-95"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
