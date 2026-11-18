'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Client, OnboardingStage } from '@/types';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Store,
  ChevronRight,
  ShieldCheck,
  Video,
} from 'lucide-react';

interface OnboardingKanbanProps {
  clients: Client[];
  onStageChange: (clientId: string, newStage: OnboardingStage) => Promise<void>;
}

interface ColumnDef {
  stage: OnboardingStage;
  label: string;
  color: string;
  badgeBg: string;
}

const ONBOARDING_COLUMNS: ColumnDef[] = [
  {
    stage: 'BRIEFING_PREENCHIDO',
    label: '1. Alinhamento & Briefing',
    color: 'border-blue-500/40 text-blue-400',
    badgeBg: 'bg-blue-500/10',
  },
  {
    stage: 'ACESSOS_LIBERADOS',
    label: '2. Acessos Meta & Google',
    color: 'border-amber-500/40 text-amber-400',
    badgeBg: 'bg-amber-500/10',
  },
  {
    stage: 'CRIATIVOS_APROVADOS',
    label: '3. Gravação & Criativos',
    color: 'border-purple-500/40 text-purple-400',
    badgeBg: 'bg-purple-500/10',
  },
  {
    stage: 'CAMPANHAS_NO_AR',
    label: '4. Campanhas no Ar',
    color: 'border-emerald-500/40 text-emerald-400',
    badgeBg: 'bg-emerald-500/10',
  },
];

export function OnboardingKanban({ clients, onStageChange }: OnboardingKanbanProps) {
  const [draggedClientId, setDraggedClientId] = useState<string | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<OnboardingStage | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedClientId(id);
  };

  const handleDragOver = (e: React.DragEvent, stage: OnboardingStage) => {
    e.preventDefault();
    if (hoveredColumn !== stage) {
      setHoveredColumn(stage);
    }
  };

  const handleDragLeave = () => {
    setHoveredColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStage: OnboardingStage) => {
    e.preventDefault();
    setHoveredColumn(null);
    const clientId = e.dataTransfer.getData('text/plain') || draggedClientId;
    if (!clientId) return;

    const client = clients.find((c) => c.id === clientId);
    if (client && client.onboardingStage !== targetStage) {
      await onStageChange(clientId, targetStage);
    }
    setDraggedClientId(null);
  };

  const getChecklistCount = (c: Client) => {
    let count = 0;
    if (c.metaAccessGranted) count++;
    if (c.pageAccessGranted) count++;
    if (c.instagramAccessGranted) count++;
    if (c.pixelCreated) count++;
    if (c.videosReceived) count++;
    if (c.creativesApproved) count++;
    return count;
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-6 pt-2">
      {ONBOARDING_COLUMNS.map((col) => {
        const columnClients = clients.filter((c) => c.onboardingStage === col.stage);
        const isHovered = hoveredColumn === col.stage;

        return (
          <div
            key={col.stage}
            onDragOver={(e) => handleDragOver(e, col.stage)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.stage)}
            className={`flex w-80 shrink-0 flex-col rounded-xl border bg-surface-card transition-all ${
              isHovered
                ? 'border-brand ring-2 ring-brand/20 bg-surface-card/90 scale-[1.01]'
                : 'border-white/10'
            }`}
          >
            {/* Header da Coluna */}
            <div className={`flex items-center justify-between border-b border-white/10 px-3.5 py-3 rounded-t-xl ${col.badgeBg}`}>
              <span className={`text-xs font-bold uppercase tracking-wider ${col.color}`}>
                {col.label}
              </span>
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/10 px-1.5 text-xs font-semibold text-text-primary tabular-nums">
                {columnClients.length}
              </span>
            </div>

            {/* Lista de Cards */}
            <div className="flex flex-1 flex-col gap-2.5 p-2.5 min-h-[380px]">
              {columnClients.map((client) => {
                const hours = client.hoursInStage ?? 0;
                const isDelayed = client.isDelayed || hours > 48;
                const checklistTotal = getChecklistCount(client);

                return (
                  <div
                    key={client.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, client.id)}
                    className={`group relative flex flex-col rounded-lg border bg-surface-canvas p-3 shadow-sm transition-all cursor-grab active:cursor-grabbing hover:shadow-md ${
                      isDelayed
                        ? 'border-rose-500/50 bg-rose-500/[0.03] hover:border-rose-500'
                        : 'border-white/5 hover:border-white/20'
                    }`}
                  >
                    {/* Alerta de SLA de 48h */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <Clock className={`h-3 w-3 ${isDelayed ? 'text-rose-400 animate-pulse' : 'text-text-muted'}`} />
                        <span className={`text-[11px] font-semibold tabular-nums ${isDelayed ? 'text-rose-400' : 'text-text-muted'}`}>
                          {hours}h nesta etapa
                        </span>
                      </div>

                      {isDelayed && (
                        <span className="inline-flex items-center gap-1 rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-400 border border-rose-500/30">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          Gargalo (&gt;48h)
                        </span>
                      )}
                    </div>

                    {/* Dados do Delivery */}
                    <Link
                      href={`/clients/${client.id}`}
                      className="group/link flex items-start gap-2"
                    >
                      <Store className="h-3.5 w-3.5 shrink-0 text-text-muted mt-0.5 group-hover/link:text-brand transition-colors" />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-text-primary group-hover/link:text-brand transition-colors truncate flex items-center gap-1">
                          <span>{client.deliveryNome}</span>
                          <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                        </h4>
                        <p className="text-[11px] text-text-muted truncate">
                          {client.nome} • {client.cidade}
                        </p>
                      </div>
                    </Link>

                    {/* Progresso do Checklist */}
                    <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2 text-[11px]">
                      <span className="text-text-muted flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3 text-brand" />
                        <span>Checklist:</span>
                      </span>
                      <span className="font-semibold text-text-primary tabular-nums">
                        {checklistTotal} de 6 itens
                      </span>
                    </div>

                    {/* Seletor rápido de etapa */}
                    <div className="mt-2.5 flex items-center justify-between pt-1">
                      <span className="text-[10px] text-text-muted">Mover etapa:</span>
                      <select
                        value={client.onboardingStage}
                        onChange={(e) => onStageChange(client.id, e.target.value as OnboardingStage)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border border-white/10 bg-surface-card px-1.5 py-0.5 text-[10px] text-text-muted hover:text-text-primary focus:outline-none"
                      >
                        <option value="BRIEFING_PREENCHIDO">1. Briefing</option>
                        <option value="ACESSOS_LIBERADOS">2. Acessos</option>
                        <option value="CRIATIVOS_APROVADOS">3. Criativos</option>
                        <option value="CAMPANHAS_NO_AR">4. No Ar</option>
                        <option value="CONCLUIDO">Concluir</option>
                      </select>
                    </div>
                  </div>
                );
              })}

              {columnClients.length === 0 && (
                <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-white/5 p-4 text-center text-xs text-text-muted">
                  Nenhum cliente nesta etapa
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
