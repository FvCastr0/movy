'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  CheckCheck,
  CheckSquare,
  Clock,
  Calendar,
  Sparkles,
  ExternalLink,
  Inbox,
  X,
} from 'lucide-react';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/lib/api';
import { AppNotification, NotificationType } from '@/types';

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'agora mesmo';
    if (diffMin < 60) return `há ${diffMin} min`;
    if (diffHour < 24) return `há ${diffHour}h`;
    if (diffDay < 7) return `há ${diffDay}d`;

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'TASK_ASSIGNED':
      return <CheckSquare className="h-4 w-4 text-[#E50914]" />;
    case 'TASK_DUE':
      return <Clock className="h-4 w-4 text-amber-400" />;
    case 'MEETING_REMINDER':
      return <Calendar className="h-4 w-4 text-sky-400" />;
    case 'SYSTEM':
    default:
      return <Sparkles className="h-4 w-4 text-violet-400" />;
  }
}

export function NotificationBellDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setIsLoading(true);
      const data = await getNotifications(false, 25);
      if (data && Array.isArray(data.items)) {
        setNotifications(data.items);
        setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0);
      }
    } catch (error) {
      // Falha silenciosa no polling de fundo para não poluir console
    } finally {
      if (!quiet) setIsLoading(false);
    }
  }, []);

  // Polling automático a cada 30 segundos e revalidação ao focar a aba
  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(() => {
      fetchNotifications(true);
    }, 30000);

    const onFocus = () => fetchNotifications(true);
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchNotifications]);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (notification: AppNotification, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (notification.read) return;

    // Atualização otimista imediata na UI
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await markNotificationAsRead(notification.id);
    } catch {
      // Em caso de erro, revalida
      fetchNotifications(true);
    }
  };

  const handleNotificationClick = async (notification: AppNotification) => {
    await handleMarkAsRead(notification);
    setIsOpen(false);

    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;

    // Otimista
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      await markAllNotificationsAsRead();
    } catch {
      fetchNotifications(true);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botão de Disparo no Header */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Abrir notificações"
        title="Central de Notificações"
        className={`relative flex h-7 w-7 items-center justify-center rounded-full border transition-all duration-200 ${
          isOpen
            ? 'bg-white/15 border-white/20 text-white'
            : 'bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10'
        }`}
      >
        <Bell className="h-3.5 w-3.5" />

        {/* Indicador Visual Vibrante de Não-Lidas */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#E50914] text-[9px] font-black text-white shadow-md shadow-red-600/50">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 top-full mt-3 w-[340px] sm:w-[380px] rounded-2xl bg-zinc-950/95 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/90 p-0 z-50 overflow-hidden"
          >
            {/* Header do Dropdown */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white tracking-wide">Notificações</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-[#E50914]/20 border border-[#E50914]/30 text-[10px] font-semibold text-[#E50914]">
                    {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    title="Marcar todas como lidas"
                    className="flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-white hover:underline transition-colors px-1.5 py-0.5 rounded"
                  >
                    <CheckCheck className="h-3 w-3 text-emerald-400" />
                    <span>Ler todas</span>
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-zinc-500 hover:text-zinc-300 p-0.5"
                  aria-label="Fechar"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Lista de Notificações */}
            <div className="max-h-[360px] overflow-y-auto divide-y divide-white/5 scrollbar-thin scrollbar-thumb-white/10">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 mb-2.5">
                    <Inbox className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold text-zinc-300">Tudo em dia!</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Nenhuma notificação encontrada no momento.
                  </p>
                </div>
              ) : (
                notifications.map((item) => {
                  const isUnread = !item.read;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`group relative flex items-start gap-3 p-3 transition-colors cursor-pointer ${
                        isUnread
                          ? 'bg-white/[0.04] hover:bg-white/[0.08]'
                          : 'hover:bg-white/[0.02] opacity-75 hover:opacity-100'
                      }`}
                    >
                      {/* Ícone por tipo */}
                      <div className="flex-shrink-0 mt-0.5 p-2 rounded-xl bg-white/5 border border-white/5 group-hover:border-white/10 transition-colors">
                        {getNotificationIcon(item.type)}
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0 pr-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4
                            className={`text-xs font-medium truncate ${
                              isUnread ? 'text-white font-semibold' : 'text-zinc-300'
                            }`}
                          >
                            {item.title}
                          </h4>
                          <span className="text-[10px] text-zinc-500 whitespace-nowrap flex-shrink-0">
                            {formatRelativeTime(item.createdAt)}
                          </span>
                        </div>

                        <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-2 leading-relaxed">
                          {item.message}
                        </p>

                        {item.link && (
                          <div className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-[#E50914] group-hover:underline">
                            <span>Ver detalhes</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </div>
                        )}
                      </div>

                      {/* Ponto indicador de não-lida */}
                      {isUnread && (
                        <div className="flex-shrink-0 self-center">
                          <span
                            className="block h-2 w-2 rounded-full bg-[#E50914] shadow-sm shadow-red-500"
                            title="Não lida"
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer do Dropdown */}
            {notifications.length > 0 && (
              <div className="px-4 py-2 bg-white/[0.02] border-t border-white/5 text-center">
                <span className="text-[10px] text-zinc-500">
                  Atualizado automaticamente a cada 30 segundos
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
