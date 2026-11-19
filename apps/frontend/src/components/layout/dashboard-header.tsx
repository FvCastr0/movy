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
  return null;
}
