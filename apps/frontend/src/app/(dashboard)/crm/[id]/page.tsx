'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Lead, LeadStage, LeadFollowUp } from '@/types';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import {
  ArrowLeft,
  Phone,
  Store,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Calendar,
  Save,
  MessageSquare,
  ShieldAlert,
  User,
  UserCheck,
  DollarSign,
  Briefcase,
  FileText,
  MapPin,
  Tag,
  Sparkles,
} from 'lucide-react';

const CRITERIA_CONFIG = [
  {
    key: 'scorePerfil',
    justKey: 'justificativaPerfil',
    label: '1. Perfil do Delivery',
    min: 2,
    description: 'Segmento compatível, cardápio estruturado, presença digital ativa.',
    options: [
      { score: 0, text: 'Fora do nicho / sem operação ativa' },
      { score: 1, text: 'Muito inicial, produto indefinido' },
      { score: 2, text: 'Operação estabelecida, cardápio claro (Mínimo)' },
      { score: 3, text: 'Excelente fit, marca forte, alto potencial' },
    ],
  },
  {
    key: 'scoreCapacidadeOperacional',
    justKey: 'justificativaOperacional',
    label: '2. Capacidade Operacional',
    min: 2,
    description: 'Cozinha e equipe suportam aumento de pedidos sem colapso.',
    options: [
      { score: 0, text: 'Gargalo crítico, atrasos constantes' },
      { score: 1, text: 'Estrutura limitada, perto da capacidade' },
      { score: 2, text: 'Consegue absorver 30-50% mais pedidos (Mínimo)' },
      { score: 3, text: 'Cozinha industrial/ociosa, pronta para escalar' },
    ],
  },
  {
    key: 'scoreNecessidadeObjetivo',
    justKey: 'justificativaNecessidade',
    label: '3. Necessidade & Objetivo',
    min: 2,
    description: 'Dor clara identificada (dependência do iFood, lucro baixo, vendas estagnadas).',
    options: [
      { score: 0, text: 'Sem dor clara, apenas curioso' },
      { score: 1, text: 'Quer "vender mais" de forma genérica' },
      { score: 2, text: 'Dor real identificada e meta definida (Mínimo)' },
      { score: 3, text: 'Urgência crítica, dor aguda com impacto direto' },
    ],
  },
  {
    key: 'scoreCapacidadeInvestir',
    justKey: 'justificativaInvestir',
    label: '4. Capacidade de Investimento',
    min: 2,
    description: 'Verba disponível para honorários de assessoria + tráfego pago.',
    options: [
      { score: 0, text: 'Sem verba / capital de giro negativo' },
      { score: 1, text: 'Apenas para tráfego, sem margem de assessoria' },
      { score: 2, text: 'Tem verba separada para tráfego + assessoria (Mínimo)' },
      { score: 3, text: 'Orçamento consolidado, focado em ROI' },
    ],
  },
  {
    key: 'scoreAcessoDecisor',
    justKey: 'justificativaDecisor',
    label: '5. Acesso ao Decisor (OBRIGATÓRIO = 3)',
    min: 3,
    description: 'Contato direto e exclusivo com o dono/sócio com poder de fechamento.',
    options: [
      { score: 0, text: 'Funcionário sem autonomia de decisão' },
      { score: 1, text: 'Gerente que precisa consultar proprietário' },
      { score: 2, text: 'Sócio parcial sem autonomia financeira' },
      { score: 3, text: 'Dono / Sócio majoritário na reunião (Obrigatório 3)' },
    ],
  },
  {
    key: 'scoreMomentoContratacao',
    justKey: 'justificativaMomento',
    label: '6. Momento de Contratação',
    min: 2,
    description: 'Previsão de início da assessoria.',
    options: [
      { score: 0, text: 'Sem previsão / mais de 90 dias' },
      { score: 1, text: 'Médio prazo (30 a 60 dias)' },
      { score: 2, text: 'Próximos 15 a 30 dias (Mínimo)' },
      { score: 3, text: 'Imediato / Esta semana' },
    ],
  },
];

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.id as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [scores, setScores] = useState<Record<string, number | null>>({
    scorePerfil: null,
    scoreCapacidadeOperacional: null,
    scoreNecessidadeObjetivo: null,
    scoreCapacidadeInvestir: null,
    scoreAcessoDecisor: null,
    scoreMomentoContratacao: null,
  });
  const [justifications, setJustifications] = useState<Record<string, string>>({
    justificativaPerfil: '',
    justificativaOperacional: '',
    justificativaNecessidade: '',
    justificativaInvestir: '',
    justificativaDecisor: '',
    justificativaMomento: '',
  });

  const [followUps, setFollowUps] = useState<LeadFollowUp[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isSavingScores, setIsSavingScores] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar dados completos do lead
  const loadLead = useCallback(async () => {
    setIsLoading(true);
    try {
      const [leadRes, followUpsRes] = await Promise.all([
        api.get<Lead>(`/leads/${leadId}`),
        api.get<LeadFollowUp[]>(`/leads/${leadId}/follow-ups`).catch(() => ({ data: [] })),
      ]);

      setLead(leadRes.data);
      setFollowUps(followUpsRes.data);

      if (leadRes.data.qualification) {
        const q = leadRes.data.qualification;
        setScores({
          scorePerfil: q.scorePerfil,
          scoreCapacidadeOperacional: q.scoreCapacidadeOperacional,
          scoreNecessidadeObjetivo: q.scoreNecessidadeObjetivo,
          scoreCapacidadeInvestir: q.scoreCapacidadeInvestir,
          scoreAcessoDecisor: q.scoreAcessoDecisor,
          scoreMomentoContratacao: q.scoreMomentoContratacao,
        });
        setJustifications({
          justificativaPerfil: q.justificativaPerfil || '',
          justificativaOperacional: q.justificativaOperacional || '',
          justificativaNecessidade: q.justificativaNecessidade || '',
          justificativaInvestir: q.justificativaInvestir || '',
          justificativaDecisor: q.justificativaDecisor || '',
          justificativaMomento: q.justificativaMomento || '',
        });
      }
    } catch (err) {
      alert('Erro ao carregar detalhes do lead.');
      router.push('/crm');
    } finally {
      setIsLoading(false);
    }
  }, [leadId, router]);

  useEffect(() => {
    loadLead();
  }, [loadLead]);

  // Cálculo Dinâmico em tempo real do Scorecard
  const scoreValues = Object.values(scores);
  const allFilled = scoreValues.every((v) => v !== null && v !== undefined);
  const totalScore = scoreValues.reduce<number>((acc, cur) => acc + (cur ?? 0), 0);

  // Checagem de travas dos critérios mínimos
  const gateChecks = [
    { label: 'Perfil (mín. 2)', passed: (scores.scorePerfil ?? 0) >= 2 },
    { label: 'Operação (mín. 2)', passed: (scores.scoreCapacidadeOperacional ?? 0) >= 2 },
    { label: 'Necessidade (mín. 2)', passed: (scores.scoreNecessidadeObjetivo ?? 0) >= 2 },
    { label: 'Investimento (mín. 2)', passed: (scores.scoreCapacidadeInvestir ?? 0) >= 2 },
    { label: 'Decisor (obrigatório 3)', passed: (scores.scoreAcessoDecisor ?? 0) === 3 },
    { label: 'Momento (mín. 2)', passed: (scores.scoreMomentoContratacao ?? 0) >= 2 },
  ];

  const allMinsPassed = allFilled && gateChecks.every((g) => g.passed);

  let priorityLabel = 'INCOMPLETA';
  let priorityColor = 'text-zinc-500 bg-zinc-800';
  if (allFilled) {
    if (totalScore >= 14) {
      priorityLabel = 'ALTA';
      priorityColor = 'text-status-success bg-status-success/15';
    } else if (totalScore >= 10) {
      priorityLabel = 'EM DESENVOLVIMENTO';
      priorityColor = 'text-status-warning bg-status-warning/15';
    } else {
      priorityLabel = 'BAIXA PRONTIDÃO';
      priorityColor = 'text-status-danger bg-status-danger/15';
    }
  }

  // Salvar Avaliação no Backend
  const handleSaveQualification = async () => {
    setIsSavingScores(true);
    setSaveSuccessMessage(null);
    try {
      await api.patch(`/leads/${leadId}/qualification`, {
        ...scores,
        ...justifications,
      });
      setSaveSuccessMessage('Scorecard de qualificação salvo com sucesso!');
      setTimeout(() => setSaveSuccessMessage(null), 3500);
      loadLead();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Falha ao salvar qualificação.');
    } finally {
      setIsSavingScores(false);
    }
  };

  // Alterar Etapa do Lead no CRM
  const handleStageChange = async (newStage: LeadStage) => {
    if (!lead) return;
    try {
      await api.patch(`/leads/${leadId}/crm-stage`, { stage: newStage });
      setLead({ ...lead, stage: newStage });
    } catch {
      alert('Falha ao atualizar etapa do lead.');
    }
  };

  // Converter Lead Fechado em Cliente
  const handleConvertToClient = async () => {
    if (!lead) return;
    const confirmConversion = window.confirm(
      `Deseja converter ${lead.deliveryNome} em Cliente ativo da MOVY? O lead será transferido para a gestão de clientes.`
    );
    if (!confirmConversion) return;

    try {
      const res = await api.post(`/clients/convert-from-lead/${leadId}`, {});
      const createdClient = res.data;
      if (createdClient?.id) {
        alert('Lead convertido com sucesso em Cliente ativo da MOVY!');
        router.push(`/clients/${createdClient.id}`);
      }
    } catch (err: any) {
      console.error('Erro ao converter lead:', err);
      alert(err.response?.data?.message || 'Falha ao converter lead em cliente.');
    }
  };

  // Adicionar Nota de Follow-up
  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !lead) return;

    setIsSavingNote(true);
    try {
      const res = await api.post(`/leads/${leadId}/follow-ups`, {
        content: newNote.trim(),
      });
      setFollowUps([res.data, ...followUps]);
      setNewNote('');
    } catch {
      alert('Erro ao registrar histórico de follow-up.');
    } finally {
      setIsSavingNote(false);
    }
  };

  if (isLoading || !lead) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-canvas">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  const isClosed = lead.stage === 'FECHADO' || (lead.stage as any) === 'GANHO';
  const isOutbound = lead.origemTipo === 'OUTBOUND' || lead.origem === 'PROSPECCAO_ATIVA';

  return (
    <div className="min-h-screen bg-surface-canvas pb-16">
      <DashboardHeader />

      <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        {/* Barra Superior de Retorno & Ações Rápidas */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <Link
              href="/crm"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-surface-card text-text-muted hover:text-text-primary hover:border-white/20 transition-all active:scale-95"
              title="Voltar para o Pipeline Comercial"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-brand" />
                <h1 className="text-xl font-bold text-text-primary">
                  {lead.deliveryNome}
                </h1>
                <span className="rounded bg-white/5 px-2 py-0.5 text-xs text-text-secondary">
                  {lead.segmento}
                </span>
                <span
                  className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    isOutbound
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                  }`}
                >
                  {isOutbound ? 'Outbound' : 'Inbound'}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-text-muted">
                Responsável: <strong className="text-text-secondary">{lead.nome}</strong> • {lead.cidade}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Botão Direto para o WhatsApp */}
            <a
              href={`https://wa.me/55${lead.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-status-success/30 bg-status-success/10 px-3.5 py-2 text-xs font-semibold text-status-success hover:bg-status-success/20 transition-all active:scale-95"
            >
              <Phone className="h-3.5 w-3.5" />
              <span>WhatsApp ({lead.whatsapp})</span>
            </a>

            {/* Seletor de Etapa Comercial */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-text-muted">Etapa:</span>
              <select
                value={lead.stage === 'GANHO' ? 'FECHADO' : lead.stage}
                onChange={(e) => handleStageChange(e.target.value as LeadStage)}
                className="rounded-xl border border-white/10 bg-surface-card px-3 py-2 text-xs font-bold text-text-primary focus:border-brand focus:outline-none"
              >
                <option value="NOVO">1. Novos Leads</option>
                <option value="CONTATO_INICIADO">2. Em Contato</option>
                <option value="REUNIAO_AGENDADA">3. Reunião Agendada</option>
                <option value="NO_SHOW">4. No-Show</option>
                <option value="PROPOSTA_ENVIADA">5. Proposta Enviada</option>
                <option value="FECHADO">6. Fechado</option>
                <option value="PERDIDO">7. Perdido</option>
              </select>
            </div>

            {/* Botão de Converter em Cliente quando Fechado */}
            {isClosed && (
              <button
                type="button"
                onClick={handleConvertToClient}
                className="inline-flex items-center gap-1.5 rounded-xl bg-status-success px-4 py-2 text-xs font-bold text-white shadow-lg shadow-status-success/20 hover:brightness-110 active:scale-95 transition-all"
              >
                <UserCheck className="h-4 w-4" />
                <span>Converter em Cliente</span>
              </button>
            )}
          </div>
        </div>

        {/* Layout em 2 Colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna 1 & 2: Scorecard de Qualificação SDR */}
          <div className="lg:col-span-2 space-y-6">
            {/* Banner de Diagnóstico e Score Total */}
            <div className="rounded-2xl border border-white/10 bg-surface-card p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Score de Qualificação SDR
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-text-primary">
                      {totalScore}
                    </span>
                    <span className="text-sm font-semibold text-text-muted">/ 18 pontos</span>
                    <span
                      className={`ml-2 rounded-full px-2.5 py-0.5 text-xs font-bold ${priorityColor}`}
                    >
                      {priorityLabel}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    {allMinsPassed ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-status-success">
                        <CheckCircle2 className="h-4 w-4" />
                        Critérios Mínimos Atingidos
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-status-danger">
                        <ShieldAlert className="h-4 w-4" />
                        Requisitos Mínimos Não Atingidos
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-text-muted">
                    {allFilled ? 'Todos os 6 critérios preenchidos' : 'Preenchimento incompleto'}
                  </span>
                </div>
              </div>

              {/* Badges dos Requisitos de Corte */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 border-t border-white/5 pt-3">
                {gateChecks.map((check, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${
                      check.passed
                        ? 'border-status-success/20 bg-status-success/5 text-status-success'
                        : 'border-status-danger/20 bg-status-danger/5 text-status-danger'
                    }`}
                  >
                    {check.passed ? (
                      <CheckCircle2 className="h-3 w-3 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                    )}
                    <span className="truncate">{check.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Formulário dos 6 Critérios com Justificativas */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <FileText className="h-4 w-4 text-brand" />
                  Critérios de Diagnóstico & Avaliação
                </h3>

                {saveSuccessMessage && (
                  <span className="text-xs font-bold text-status-success animate-fade-in flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {saveSuccessMessage}
                  </span>
                )}
              </div>

              {CRITERIA_CONFIG.map((crit) => {
                const currentScore = scores[crit.key];
                const currentJust = justifications[crit.justKey] || '';

                return (
                  <div
                    key={crit.key}
                    className="rounded-xl border border-white/10 bg-surface-card p-4 transition-all hover:border-white/20"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
                      <div>
                        <h4 className="text-xs font-bold text-text-primary">{crit.label}</h4>
                        <p className="text-[11px] text-text-muted">{crit.description}</p>
                      </div>
                      <span className="text-[11px] font-semibold text-text-secondary">
                        Nota: <strong className="text-brand">{currentScore ?? '-'}</strong> / 3
                      </span>
                    </div>

                    {/* Seleção de Pontuação */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mt-3">
                      {crit.options.map((opt) => (
                        <button
                          key={opt.score}
                          type="button"
                          onClick={() => setScores({ ...scores, [crit.key]: opt.score })}
                          className={`rounded-lg border p-2 text-left transition-all ${
                            currentScore === opt.score
                              ? 'border-brand bg-brand/10 text-text-primary font-bold shadow-sm'
                              : 'border-white/5 bg-surface-canvas text-text-muted hover:border-white/20 hover:text-text-secondary'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span>Score {opt.score}</span>
                            {opt.score >= crit.min && (
                              <span className="text-[10px] text-status-success font-semibold">
                                ✓ Mín.
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] leading-relaxed line-clamp-2">{opt.text}</p>
                        </button>
                      ))}
                    </div>

                    {/* Campo de Justificativa */}
                    <div className="mt-3">
                      <input
                        type="text"
                        placeholder="Justificativa da pontuação (ex: Dono confirmou em ligação presença na reunião)..."
                        value={currentJust}
                        onChange={(e) =>
                          setJustifications({ ...justifications, [crit.justKey]: e.target.value })
                        }
                        className="w-full rounded-lg border border-white/10 bg-surface-canvas px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
                      />
                    </div>
                  </div>
                );
              })}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSaveQualification}
                  disabled={isSavingScores}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-brand/20 hover:bg-brand-hover active:scale-95 disabled:opacity-50 transition-all"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSavingScores ? 'Salvando Avaliação...' : 'Salvar Scorecard de Qualificação'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Coluna 3: Dados do Lead & Histórico de Follow-ups */}
          <div className="space-y-6">
            {/* Informações Cadastrais */}
            <div className="rounded-2xl border border-white/10 bg-surface-card p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Dados Cadastrais do Lead
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-text-muted text-[11px] block">Nome do Responsável</span>
                  <span className="font-semibold text-text-primary">{lead.nome}</span>
                </div>

                <div>
                  <span className="text-text-muted text-[11px] block">Nome do Delivery</span>
                  <span className="font-semibold text-text-primary">{lead.deliveryNome}</span>
                </div>

                <div>
                  <span className="text-text-muted text-[11px] block">Segmento / Culinária</span>
                  <span className="font-semibold text-text-primary">{lead.segmento}</span>
                </div>

                <div>
                  <span className="text-text-muted text-[11px] block">Cidade / UF</span>
                  <span className="font-semibold text-text-primary">{lead.cidade}</span>
                </div>

                <div>
                  <span className="text-text-muted text-[11px] block">Origem do Cadastro</span>
                  <span className="font-semibold text-text-primary">
                    {lead.origemTipo || lead.origem || 'Landing Page'}
                  </span>
                </div>

                {lead.dealValue && (
                  <div>
                    <span className="text-text-muted text-[11px] block">Valor da Oportunidade</span>
                    <span className="font-bold text-emerald-400 text-sm">
                      R$ {lead.dealValue.toLocaleString('pt-BR')}
                    </span>
                  </div>
                )}

                {lead.meetingDate && (
                  <div>
                    <span className="text-text-muted text-[11px] block">Data da Reunião</span>
                    <span className="font-semibold text-brand">
                      {new Date(lead.meetingDate).toLocaleString('pt-BR')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Linha do Tempo de Follow-ups & Notas */}
            <div className="rounded-2xl border border-white/10 bg-surface-card p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-brand" />
                Histórico & Notas de Contato
              </h3>

              {/* Form Nova Nota */}
              <form onSubmit={handleAddFollowUp} className="space-y-2">
                <textarea
                  rows={3}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Registrar nova nota, ligação ou avanço na negociação..."
                  className="w-full rounded-xl border border-white/10 bg-surface-canvas p-2.5 text-xs text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isSavingNote || !newNote.trim()}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 py-2 text-xs font-semibold text-text-primary disabled:opacity-50 transition-colors"
                >
                  <Send className="h-3.5 w-3.5 text-brand" />
                  <span>{isSavingNote ? 'Registrando...' : 'Adicionar Nota'}</span>
                </button>
              </form>

              {/* Lista de Follow-ups */}
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {followUps.length === 0 ? (
                  <p className="text-xs text-text-muted italic py-3 text-center">
                    Nenhum registro de contato adicionado ainda.
                  </p>
                ) : (
                  followUps.map((fu) => (
                    <div
                      key={fu.id}
                      className="rounded-lg border border-white/5 bg-surface-canvas p-3 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-[10px] text-text-muted">
                        <span className="font-semibold text-text-secondary">{fu.user?.name || 'Gestor'}</span>
                        <span>{new Date(fu.createdAt).toLocaleString('pt-BR')}</span>
                      </div>
                      <p className="text-text-primary leading-relaxed whitespace-pre-wrap">{fu.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
