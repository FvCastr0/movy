'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Lead, LeadStage } from '@/types';
import { MicroRadar } from './micro-radar';
import { Phone, Calendar, ChevronRight, Store, ArrowRight, CheckCircle2 } from 'lucide-react';

interface LeadKanbanProps {
  leads: Lead[];
  onStageChange: (leadId: string, newStage: LeadStage) => Promise<void>;
}

interface ColumnDef {
  stage: LeadStage;
  label: string;
  color: string;
}

const COLUMNS: ColumnDef[] = [
  { stage: 'NOVO', label: 'Novos Leads', color: 'border-blue-500/40 text-blue-400' },
  { stage: 'PRE_QUALIFICADO', label: 'Pré-Qualificados', color: 'border-purple-500/40 text-purple-400' },
  { stage: 'CONTATO_INICIADO', label: 'Contato Iniciado', color: 'border-amber-500/40 text-amber-400' },
  { stage: 'REUNIAO_AGENDADA', label: 'Reunião Agendada', color: 'border-brand/40 text-brand' },
  { stage: 'PROPOSTA_ENVIADA', label: 'Proposta Enviada', color: 'border-indigo-500/40 text-indigo-400' },
];

export function LeadKanban({ leads, onStageChange }: LeadKanbanProps) {
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<LeadStage | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedLeadId(id);
  };

  const handleDragOver = (e: React.DragEvent, stage: LeadStage) => {
    e.preventDefault();
    if (hoveredColumn !== stage) {
      setHoveredColumn(stage);
    }
  };

  const handleDragLeave = () => {
    setHoveredColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStage: LeadStage) => {
    e.preventDefault();
    setHoveredColumn(null);
    const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
    if (!leadId) return;

    const lead = leads.find((l) => l.id === leadId);
    if (lead && lead.stage !== targetStage) {
      await onStageChange(leadId, targetStage);
    }
    setDraggedLeadId(null);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-6 pt-2 scrollbar-thin">
      {COLUMNS.map((col) => {
        const columnLeads = leads.filter((lead) => lead.stage === col.stage);
        const isHovered = hoveredColumn === col.stage;

        return (
          <div
            key={col.stage}
            onDragOver={(e) => handleDragOver(e, col.stage)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.stage)}
            className={`flex w-80 shrink-0 flex-col rounded-xl border transition-colors ${isHovered
                ? 'border-brand/50 bg-brand/5'
                : 'border-white/10 bg-surface-card/60'
              }`}
          >
            {/* Header da Coluna */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold uppercase tracking-wider ${col.color}`}>
                  {col.label}
                </span>
              </div>
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-text-muted tabular-nums">
                {columnLeads.length}
              </span>
            </div>

            {/* Lista de Cards */}
            <div className="flex flex-1 flex-col gap-3 p-3 min-h-[500px]">
              {columnLeads.length === 0 ? (
                <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-white/5 p-4 text-center">
                  <p className="text-xs text-text-muted">Nenhum lead nesta etapa</p>
                </div>
              ) : (
                columnLeads.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    className="group relative rounded-xl border border-white/10 bg-surface-card p-3.5 shadow-sm transition-all duration-150 hover:border-white/20 hover:shadow-md cursor-grab active:cursor-grabbing active:scale-[0.98]"
                  >
                    {/* Header do Card: Nome Delivery & Segmento */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Store className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                          <h4 className="truncate text-sm font-semibold text-text-primary group-hover:text-white">
                            {lead.deliveryNome}
                          </h4>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-text-secondary">
                          {lead.nome} • {lead.cidade}
                        </p>
                      </div>

                      <span className="shrink-0 rounded bg-white/5 px-2 py-0.5 text-[10px] font-medium text-text-muted">
                        {lead.segmento}
                      </span>
                    </div>

                    {/* Micro-Radar de Qualificação Comercial */}
                    <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2.5">
                      <MicroRadar qualification={lead.qualification} compact />

                      {lead.qualification?.priority && (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${lead.qualification.priority === 'ALTA'
                              ? 'bg-status-success/15 text-status-success'
                              : lead.qualification.priority === 'EM_DESENVOLVIMENTO'
                                ? 'bg-status-warning/15 text-status-warning'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}
                        >
                          {lead.qualification.priority === 'ALTA'
                            ? 'ALTA'
                            : lead.qualification.priority === 'EM_DESENVOLVIMENTO'
                              ? 'EM DESENV.'
                              : 'BAIXA'}
                        </span>
                      )}
                    </div>

                    {/* Rodapé: Contato e Link para Ficha */}
                    <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2 text-[11px] text-text-muted">
                      <a
                        href={`https://wa.me/55${lead.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-text-secondary hover:text-status-success transition-colors"
                        title="Abrir WhatsApp"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="h-3 w-3" />
                        <span>{lead.whatsapp}</span>
                      </a>

                      <Link
                        href={`/leads/${lead.id}`}
                        className="inline-flex items-center gap-0.5 font-semibold text-text-secondary hover:text-brand transition-colors"
                      >
                        <span>Ficha</span>
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
