'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Lead, LeadStage, LeadPriority } from '@/types';
import { MicroRadar } from './micro-radar';
import { Search, Phone, ExternalLink, ChevronRight, Filter } from 'lucide-react';

interface LeadTableProps {
  leads: Lead[];
  onStageChange: (leadId: string, newStage: LeadStage) => Promise<void>;
}

const STAGES: { value: LeadStage; label: string }[] = [
  { value: 'NOVO', label: 'Novo Lead' },
  { value: 'PRE_QUALIFICADO', label: 'Pré-Qualificado' },
  { value: 'CONTATO_INICIADO', label: 'Contato Iniciado' },
  { value: 'REUNIAO_AGENDADA', label: 'Reunião Agendada' },
  { value: 'PROPOSTA_ENVIADA', label: 'Proposta Enviada' },
  { value: 'GANHO', label: 'Ganho' },
  { value: 'PERDIDO', label: 'Perdido' },
];

export function LeadTable({ leads, onStageChange }: LeadTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');

  // Filtragem combinada
  const filteredLeads = leads.filter((lead) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      lead.deliveryNome.toLowerCase().includes(term) ||
      lead.nome.toLowerCase().includes(term) ||
      lead.cidade.toLowerCase().includes(term) ||
      lead.whatsapp.includes(term);

    const matchesStage = selectedStage === 'ALL' || lead.stage === selectedStage;
    const matchesPriority =
      selectedPriority === 'ALL' || lead.qualification?.priority === selectedPriority;

    return matchesSearch && matchesStage && matchesPriority;
  });


  return (
    <div className="space-y-4">
      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por delivery, responsável, WhatsApp ou cidade..."
            className="w-full rounded-xl border border-white/10 bg-surface-card py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted transition-all focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Filtro por Etapa */}
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="rounded-xl border border-white/10 bg-surface-card px-3 py-2 text-xs font-semibold text-text-secondary focus:border-brand focus:outline-none"
          >
            <option value="ALL">Todas as Etapas</option>
            {STAGES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          {/* Filtro por Prioridade */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="rounded-xl border border-white/10 bg-surface-card px-3 py-2 text-xs font-semibold text-text-secondary focus:border-brand focus:outline-none"
          >
            <option value="ALL">Todas as Prioridades</option>
            <option value="ALTA">Alta</option>
            <option value="EM_DESENVOLVIMENTO">Em Desenvolvimento</option>
            <option value="BAIXA_PRONTIDAO">Baixa Prontidão</option>
          </select>
        </div>
      </div>

      {/* Tabela de Dados */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-surface-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-surface-card/80 text-[11px] font-bold uppercase tracking-wider text-text-muted">
              <tr>
                <th className="px-5 py-3.5">Delivery / Responsável</th>
                <th className="px-4 py-3.5">Segmento & Cidade</th>
                <th className="px-4 py-3.5">WhatsApp</th>
                <th className="px-4 py-3.5">Micro-Radar SDR</th>
                <th className="px-4 py-3.5">Etapa Atual</th>
                <th className="px-4 py-3.5">Prioridade</th>
                <th className="px-4 py-3.5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-xs text-text-muted">
                    Nenhum lead encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="group transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-text-primary group-hover:text-white">
                        {lead.deliveryNome}
                      </div>
                      <div className="text-xs text-text-muted">
                        {lead.nome}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-xs text-text-secondary">
                      <div>{lead.segmento}</div>
                      <div className="text-[11px] text-text-muted">{lead.cidade}</div>
                    </td>

                    <td className="px-4 py-3.5 text-xs tabular-nums">
                      <a
                        href={`https://wa.me/55${lead.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-text-secondary hover:text-status-success transition-colors"
                      >
                        <Phone className="h-3 w-3" />
                        <span>{lead.whatsapp}</span>
                      </a>
                    </td>

                    <td className="px-4 py-3.5">
                      <MicroRadar qualification={lead.qualification} />
                    </td>

                    <td className="px-4 py-3.5">
                      <select
                        value={lead.stage}
                        onChange={(e) => onStageChange(lead.id, e.target.value as LeadStage)}
                        className="rounded-lg border border-white/10 bg-surface-inset px-2.5 py-1 text-xs font-medium text-text-primary focus:border-brand focus:outline-none"
                      >
                        {STAGES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-4 py-3.5">
                      {lead.qualification?.priority ? (
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${lead.qualification.priority === 'ALTA'
                            ? 'bg-status-success/15 text-status-success'
                            : lead.qualification.priority === 'EM_DESENVOLVIMENTO'
                              ? 'bg-status-warning/15 text-status-warning'
                              : 'bg-zinc-800 text-zinc-400'
                            }`}
                        >
                          {lead.qualification.priority}
                        </span>
                      ) : (
                        <span className="text-[11px] text-text-muted italic">Pendente</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-surface-card px-2.5 py-1 text-xs font-semibold text-text-secondary hover:border-brand/40 hover:text-white transition-all active:scale-95"
                      >
                        <span>Ficha</span>
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
