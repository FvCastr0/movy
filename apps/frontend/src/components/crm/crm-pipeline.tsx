'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Lead, LeadStage } from '@/types';
import { CrmStageModal } from './crm-stage-modal';
import {
  Phone,
  Calendar,
  Store,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  MessageCircle,
  FileText,
} from 'lucide-react';

interface CrmPipelineProps {
  leads: Lead[];
  onStageChange: (
    leadId: string,
    stage: LeadStage,
    data?: { lostReason?: string; meetingDate?: string; dealValue?: number; closerResponsibleId?: string }
  ) => Promise<void>;
}

interface ColumnDef {
  stage: LeadStage;
  label: string;
  color: string;
  headerBg: string;
}

const CRM_COLUMNS: ColumnDef[] = [
  { stage: 'NOVO', label: '1. Novos Leads', color: 'border-blue-500/40 text-blue-400', headerBg: 'bg-blue-500/10' },
  { stage: 'CONTATO_INICIADO', label: '2. Em Contato', color: 'border-amber-500/40 text-amber-400', headerBg: 'bg-amber-500/10' },
  { stage: 'REUNIAO_AGENDADA', label: '3. Reunião Agendada', color: 'border-brand/40 text-brand', headerBg: 'bg-brand/10' },
  { stage: 'NO_SHOW', label: '4. No-Show', color: 'border-rose-500/40 text-rose-400', headerBg: 'bg-rose-500/10' },
  { stage: 'PROPOSTA_ENVIADA', label: '5. Proposta Enviada', color: 'border-indigo-500/40 text-indigo-400', headerBg: 'bg-indigo-500/10' },
  { stage: 'FECHADO', label: '6. Fechado', color: 'border-emerald-500/40 text-emerald-400', headerBg: 'bg-emerald-500/10' },
  { stage: 'PERDIDO', label: '7. Perdido', color: 'border-zinc-500/40 text-zinc-400', headerBg: 'bg-zinc-500/10' },
];

export function CrmPipeline({ leads, onStageChange }: CrmPipelineProps) {
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<LeadStage | null>(null);

  // Controle do modal de transição (motivo de perda ou reunião)
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    lead: Lead | null;
    targetStage: LeadStage | null;
  }>({
    isOpen: false,
    lead: null,
    targetStage: null,
  });

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

  const triggerStageTransition = (lead: Lead, targetStage: LeadStage) => {
    if (targetStage === 'PERDIDO' || targetStage === 'REUNIAO_AGENDADA') {
      setModalState({
        isOpen: true,
        lead,
        targetStage,
      });
    } else {
      onStageChange(lead.id, targetStage);
    }
  };

  const handleDrop = (e: React.DragEvent, targetStage: LeadStage) => {
    e.preventDefault();
    setHoveredColumn(null);
    const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
    if (!leadId) return;

    const lead = leads.find((l) => l.id === leadId);
    if (lead && lead.stage !== targetStage) {
      triggerStageTransition(lead, targetStage);
    }
    setDraggedLeadId(null);
  };

  const formatCurrency = (val?: number | null) => {
    if (!val) return null;
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  };

  const formatMeetingDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const cleanWhatsappNumber = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return digits.startsWith('55') ? digits : `55${digits}`;
  };

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-6 pt-2">
        {CRM_COLUMNS.map((col) => {
          // Trata compatibilidade: leads legados com 'GANHO' aparecem em 'FECHADO'
          const columnLeads = leads.filter((l) => {
            if (col.stage === 'FECHADO') {
              return l.stage === 'FECHADO' || (l.stage as any) === 'GANHO';
            }
            return l.stage === col.stage;
          });

          const columnValue = columnLeads.reduce((acc, l) => acc + (l.dealValue || 0), 0);
          const isHovered = hoveredColumn === col.stage;

          return (
            <div
              key={col.stage}
              onDragOver={(e) => handleDragOver(e, col.stage)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.stage)}
              className={`flex w-72 shrink-0 flex-col rounded-xl border bg-surface-card transition-all ${
                isHovered
                  ? 'border-brand ring-2 ring-brand/20 bg-surface-card/90 scale-[1.01]'
                  : 'border-white/10'
              }`}
            >
              {/* Header da Coluna */}
              <div className={`flex items-center justify-between border-b border-white/10 px-3.5 py-3 rounded-t-xl ${col.headerBg}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold uppercase tracking-wider ${col.color}`}>
                    {col.label}
                  </span>
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/10 px-1.5 text-xs font-semibold text-text-primary tabular-nums">
                    {columnLeads.length}
                  </span>
                </div>
                {columnValue > 0 && (
                  <span className="text-xs font-semibold text-text-muted tabular-nums">
                    {formatCurrency(columnValue)}
                  </span>
                )}
              </div>

              {/* Lista de Cards */}
              <div className="flex flex-1 flex-col gap-2.5 p-2.5 min-h-[380px]">
                {columnLeads.map((lead) => {
                  const isOutbound = lead.origemTipo === 'OUTBOUND' || lead.origem === 'PROSPECCAO_ATIVA';

                  return (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      className="group relative flex flex-col rounded-lg border border-white/5 bg-surface-canvas p-3 shadow-sm hover:border-white/20 transition-all cursor-grab active:cursor-grabbing hover:shadow-md"
                    >
                      {/* Top Bar: Badges e Origem */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            isOutbound
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                          }`}
                        >
                          {isOutbound ? 'Outbound' : 'Inbound'}
                        </span>

                        {lead.dealValue && (
                          <span className="text-xs font-bold text-emerald-400 tabular-nums">
                            {formatCurrency(lead.dealValue)}
                          </span>
                        )}
                      </div>

                      {/* Nome do Restaurante e Contato */}
                      <div className="flex items-start gap-2">
                        <Store className="h-3.5 w-3.5 shrink-0 text-text-muted mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/crm/${lead.id}`}
                            className="text-xs font-bold text-text-primary truncate block hover:text-brand transition-colors"
                            title="Abrir ficha do lead"
                          >
                            {lead.deliveryNome}
                          </Link>
                          <p className="text-[11px] text-text-muted truncate">
                            {lead.nome} • {lead.segmento}
                          </p>
                        </div>
                      </div>

                      {/* Cidade e Localização */}
                      <p className="mt-1 text-[10px] text-text-muted">
                        📍 {lead.cidade}
                      </p>

                      {/* Reunião Agendada & Closer Responsável (Se houver) */}
                      {lead.meetingDate && (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-1.5 rounded bg-brand/10 px-2 py-1 text-[11px] font-semibold text-brand">
                            <Calendar className="h-3 w-3 shrink-0" />
                            <span>Reunião: {formatMeetingDate(lead.meetingDate)}</span>
                          </div>
                          {lead.closerResponsible && (
                            <div className="flex items-center gap-1 text-[10px] text-text-muted px-1">
                              <span className="font-semibold text-text-primary">Closer:</span>
                              <span className="truncate text-emerald-400 font-medium">{lead.closerResponsible.name.split(' ')[0]}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Motivo da Perda (Se perdido) */}
                      {lead.stage === 'PERDIDO' && lead.lostReason && (
                        <div className="mt-2 flex items-start gap-1 rounded bg-rose-500/10 px-2 py-1 text-[10px] text-rose-300">
                          <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">Motivo: {lead.lostReason}</span>
                        </div>
                      )}

                      {/* Ações Rápidas no Card */}
                      <div className="mt-3 flex items-center justify-between gap-1.5 border-t border-white/5 pt-2 text-xs">
                        <div className="flex items-center gap-2">
                          <a
                            href={`https://wa.me/${cleanWhatsappNumber(lead.whatsapp)}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                            title="Chamar no WhatsApp"
                          >
                            <MessageCircle className="h-3 w-3" />
                            <span className="hidden sm:inline">WhatsApp</span>
                          </a>

                          <Link
                            href={`/crm/${lead.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 rounded bg-white/5 hover:bg-brand/20 hover:text-brand px-2 py-0.5 text-[10px] font-semibold text-text-muted transition-colors border border-white/5 hover:border-brand/30"
                            title="Abrir Ficha de Qualificação do Lead"
                          >
                            <FileText className="h-3 w-3 text-brand" />
                            <span>Ficha</span>
                          </Link>
                        </div>

                        {/* Seletor rápido de estágio */}
                        <select
                          value={lead.stage === 'GANHO' ? 'FECHADO' : lead.stage}
                          onChange={(e) => triggerStageTransition(lead, e.target.value as LeadStage)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border border-white/10 bg-surface-card px-1.5 py-0.5 text-[10px] text-text-muted hover:text-text-primary focus:outline-none"
                        >
                          <option value="NOVO">Novo</option>
                          <option value="CONTATO_INICIADO">Em Contato</option>
                          <option value="REUNIAO_AGENDADA">Agendado</option>
                          <option value="NO_SHOW">No-Show</option>
                          <option value="PROPOSTA_ENVIADA">Proposta</option>
                          <option value="FECHADO">Fechado</option>
                          <option value="PERDIDO">Perdido</option>
                        </select>
                      </div>
                    </div>
                  );
                })}

                {columnLeads.length === 0 && (
                  <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-white/5 p-4 text-center text-xs text-text-muted">
                    Nenhum lead nesta etapa
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal para confirmação de motivos ou reuniões */}
      <CrmStageModal
        isOpen={modalState.isOpen}
        lead={modalState.lead}
        targetStage={modalState.targetStage}
        onClose={() => setModalState({ isOpen: false, lead: null, targetStage: null })}
        onConfirm={onStageChange}
      />
    </>
  );
}
