'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getCurrentUser, clearSession, AuthUser } from '@/lib/auth';
import { NotificationBellDropdown } from './notification-bell-dropdown';
import {
  LayoutGrid,
  Briefcase,
  UserCheck,
  CircleDollarSign,
  LogOut,
  Menu,
  X,
  Sparkles,
  ShieldCheck,
  CheckSquare,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  exact?: boolean;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Visão Geral', href: '/', icon: LayoutGrid, exact: true },
  { label: 'Demandas', href: '/tasks', icon: CheckSquare },
  { label: 'CRM Comercial', href: '/crm', icon: Briefcase },
  { label: 'Clientes Ativos', href: '/clients', icon: UserCheck },
  { label: 'Financeiro', href: '/finance', icon: CircleDollarSign, adminOnly: true },
  { label: 'Usuários', href: '/users', icon: ShieldCheck, adminOnly: true },
];

export function DynamicPillHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setUser(getCurrentUser());
    setMounted(true);
  }, []);

  // Fecha o menu mobile ao navegar
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    clearSession();
    router.push('/login');
  };

  const isRouteActive = (item: NavItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || user?.role === 'ADMIN'
  );

  const activeItem =
    visibleNavItems.find((item) => isRouteActive(item)) ||
    visibleNavItems[0] ||
    NAV_ITEMS[0];

  return (
    <header className="fixed top-4 inset-x-0 mx-auto w-fit max-w-[95vw] z-50">
      {/* Pílula Principal Desktop / Barra de Navegação Flutuante */}
      <nav
        aria-label="Navegação Principal"
        className="relative flex items-center gap-1 sm:gap-1.5 p-1.5 rounded-full bg-zinc-950/80 backdrop-blur-xl border border-white/10 shadow-pill transition-all duration-300 hover:border-white/20"
      >
        {/* Brand & Ícone Circular da MOVY */}
        <Link
          href="/"
          className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-full group transition-colors hover:bg-white/5"
          title="MOVY - Início"
        >
          <div className="font-bold text-lg">MOVY<span className="text-[#E50914]">.</span></div>
        </Link>

        {/* Separador vertical sutil */}
        <div className="h-4 w-[1px] bg-white/10 mx-0.5 sm:mx-1" />

        {/* Links Desktop com Sliding Active Pill */}
        <div className="hidden md:flex items-center gap-1">
          {visibleNavItems.map((item) => {
            const active = isRouteActive(item);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-200 select-none ${active
                  ? 'text-white'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                  }`}
              >
                {/* Indicador animado com física de mola (layoutId) */}
                {active && mounted && (
                  <motion.div
                    layoutId="dynamicActivePill"
                    className="absolute inset-0 rounded-full bg-white/10 border border-white/15 shadow-sm"
                    transition={{
                      type: 'spring',
                      stiffness: 450,
                      damping: 32,
                    }}
                  />
                )}
                <Icon className={`relative z-10 h-3.5 w-3.5 ${active ? 'text-brand-light' : 'text-zinc-400'}`} />
                <span className="relative z-10 whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Em telas menores (Mobile): Exibe a aba ativa em pílula e o botão circular de menu */}
        <div className="flex md:hidden items-center gap-1.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-white">
            <activeItem.icon className="h-3.5 w-3.5 text-brand" />
            <span className="truncate max-w-[120px]">{activeItem.label}</span>
          </div>

          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu de navegação'}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            {mobileMenuOpen ? <X className="h-3.5 w-3.5" /> : <Menu className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Separador vertical sutil */}
        <div className="h-4 w-[1px] bg-white/10 mx-0.5 sm:mx-1" />

        {/* Central de Notificações com Badge e Dropdown */}
        <NotificationBellDropdown />

        {/* Separador vertical sutil */}
        <div className="h-4 w-[1px] bg-white/10 mx-0.5 sm:mx-1" />

        {/* Área de Perfil & Logout */}
        <div className="flex items-center gap-1.5 pl-1 pr-1.5">
          {user && (
            <div
              className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-[11px] text-zinc-300"
              title={`Logado como ${user.name} (${user.role})`}
            >
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="truncate max-w-[90px] font-medium">{user.name.split(' ')[0]}</span>
            </div>
          )}

          <button
            onClick={handleLogout}
            title="Sair do sistema"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all duration-200"
            aria-label="Sair"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </nav>

      {/* Menu Mobile Suspenso (Opção A) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 8, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="md:hidden mt-2 w-64 mx-auto rounded-2xl bg-zinc-950/95 backdrop-blur-2xl border border-white/10 p-2 shadow-2xl shadow-black/80"
          >
            <div className="space-y-1">
              {visibleNavItems.map((item) => {
                const active = isRouteActive(item);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${active
                      ? 'bg-brand/15 text-white border border-brand/30'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
                      }`}
                  >
                    <Icon className={`h-4 w-4 ${active ? 'text-brand' : 'text-zinc-400'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {user && (
              <div className="mt-2 pt-2 border-t border-white/10 px-2 flex items-center justify-between text-[11px] text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-brand" />
                  <span className="truncate max-w-[120px]">{user.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-red-400 hover:underline flex items-center gap-1"
                >
                  <LogOut className="h-3 w-3" />
                  Sair
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
