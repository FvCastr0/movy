import React from 'react';
import { DynamicPillHeader } from '@/components/layout/dynamic-pill-header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-surface-canvas text-text-primary selection:bg-brand selection:text-white">
      {/* Navbar Dinâmica Flutuante Circular no Topo */}
      <DynamicPillHeader />

      {/* Conteúdo Principal com espaçamento superior para compensar a navbar flutuante */}
      <div className="pt-20 sm:pt-24 pb-16">
        {children}
      </div>
    </div>
  );
}
