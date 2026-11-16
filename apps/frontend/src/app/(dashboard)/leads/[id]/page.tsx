'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Lead, LeadQualification, LeadStage, LeadFollowUp } from '@/types';
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
      router.push('/leads');
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

  // Salvar Avaliação SDR no Backend
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

  // Alterar Etapa do Lead
  const handleStageChange = async (newStage: LeadStage) => {
    if (!lead) return;
    try {
      await api.patch(`/leads/${leadId}`, { stage: newStage });
      setLead({ ...lead, stage: newStage });
    } catch {
      alert('Falha ao atualizar etapa do lead.');
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
        stageAtMoment: lead.stage,
      });
      setFollowUps([res.data, ...followUps]);
      setNewNote('');
    } catch {
      alert('Falha ao registrar follow-up.');
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

  return (
    <div className="min-h-screen bg-surface-canvas pb-16">
      <DashboardHeader />

      <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        {/* Barra Superior de Retorno & Ações Rápidas */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <Link
              href="/leads"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-surface-card text-text-muted hover:text-text-primary hover:border-white/20 transition-all active:scale-95"
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

            {/* Seletor de Etapa */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-text-muted">Etapa:</span>
              <select
                value={lead.stage}
                onChange={(e) => handleStageChange(e.target.value as LeadStage)}
                className="rounded-xl border border-white/10 bg-surface-card px-3 py-2 text-xs font-bold text-text-primary focus:border-brand focus:outline-none"
              >
                <option value="NOVO">Novo Lead</option>
                <option value="PRE_QUALIFICADO">Pré-Qualificado</option>
                <option value="CONTATO_INICIADO">Contato Iniciado</option>
                <option value="REUNIAO_AGENDADA">Reunião Agendada</option>
                <option value="PROPOSTA_ENVIADA">Proposta Enviada</option>
                <option value="GANHO">Ganho</option>
                <option value="PERDIDO">Perdido</option>
              </select>
            </div>
          </div>
        </div>

        {/* Layout em 2 Colunas */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Coluna Esquerda: Scorecard Interativo SDR & Follow-ups */}
          <div className="space-y-6 lg:col-span-8">
            {/* Card do Scorecard */}
            <div className="rounded-2xl border border-white/10 bg-surface-card p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                <div>
                  <h2 className="text-base font-bold text-text-primary">
                    Scorecard de Qualificação SDR (Manual Oficial MOVY)
                  </h2>
                  <p className="text-xs text-text-muted mt-0.5">
                    Pontue cada critério de 0 a 3 conforme a ligação de diagnóstico comercial.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSaveQualification}
                  disabled={isSavingScores}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white shadow-md shadow-brand/20 hover:bg-brand-hover transition-all active:scale-95 disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{isSavingScores ? 'Salvando...' : 'Salvar Scorecard'}</span>
                </button>
              </div>

              {saveSuccessMessage && (
                <div className="mb-6 flex items-center gap-2 rounded-xl border border-status-success/30 bg-status-success/10 p-3 text-xs text-status-success">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{saveSuccessMessage}</span>
                </div>
              )}

              {/* Lista dos 6 Critérios Oficiais */}
              <div className="space-y-6">
                {CRITERIA_CONFIG.map((c) => {
                  const currentVal = scores[c.key];
                  const currentJust = justifications[c.justKey] || '';

                  return (
                    <div
                      key={c.key}
                      className="rounded-xl border border-white/5 bg-surface-inset p-4 transition-colors hover:border-white/10"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-text-primary">
                              {c.label}
                            </h3>
                            <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-text-muted">
                              Mínimo: {c.min}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-text-secondary">
                            {c.description}
                          </p>
                        </div>

                        {/* Seletor Tátil 0 a 3 */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {[0, 1, 2, 3].map((val) => {
                            const isSelected = currentVal === val;
                            return (
                              <button
                                key={val}
                                type="button"
                                onClick={() =>
                                  setScores((prev) => ({ ...prev, [c.key]: val }))
                                }
                                className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold transition-all active:scale-95 ${
                                  isSelected
                                    ? val >= c.min
                                      ? 'bg-status-success text-white shadow-md shadow-status-success/20 ring-2 ring-status-success/30'
                                      : 'bg-status-danger text-white shadow-md shadow-status-danger/20 ring-2 ring-status-danger/30'
                                    : 'border border-white/10 bg-surface-card text-text-secondary hover:border-white/20 hover:text-white'
                                }`}
                              >
                                {val}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Campo de Justificativa da Nota */}
                      <div className="mt-3">
                        <input
                          type="text"
                          value={currentJust}
                          onChange={(e) =>
                            setJustifications((prev) => ({
                              ...prev,
                              [c.justKey]: e.target.value,
                            }))
                          }
                          placeholder={`Justificativa para a nota em ${c.label}...`}
                          className="w-full rounded-lg border border-white/5 bg-surface-card px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted/60 focus:border-brand focus:outline-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Linha do Tempo de Follow-up */}
            <div className="rounded-2xl border border-white/10 bg-surface-card p-6 shadow-sm">
              <h2 className="text-base font-bold text-text-primary mb-4 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-brand" />
                Histórico de Contatos & Follow-up
              </h2>

              {/* Formulário de Registro de Nova Interação */}
              <form onSubmit={handleAddFollowUp} className="mb-6 space-y-3">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Registre o resumo do contato com o lead (objeções, pontos de interesse, acordos)..."
                  rows={3}
                  className="w-full rounded-xl border border-white/10 bg-surface-inset p-3 text-xs text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
                  required
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingNote || !newNote.trim()}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/15 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Send className="h-3 w-3" />
                    <span>{isSavingNote ? 'Registrando...' : 'Registrar Follow-up'}</span>
                  </button>
                </div>
              </form>

              {/* Lista Cronológica de Follow-ups */}
              <div className="space-y-3 border-t border-white/10 pt-4">
                {followUps.length === 0 ? (
                  <p className="text-center py-6 text-xs text-text-muted">
                    Nenhum histórico registrado até o momento.
                  </p>
                ) : (
                  followUps.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-white/5 bg-surface-inset p-3.5 text-xs"
                    >
                      <div className="flex items-center justify-between text-[11px] text-text-muted mb-1.5">
                        <span className="font-semibold text-text-secondary flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {item.user?.name || 'SDR'}
                        </span>
                        <span className="tabular-nums">
                          {new Date(item.createdAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-text-primary leading-relaxed whitespace-pre-wrap">
                        {item.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Coluna Direita: Gate Radar & Recomendação Automática */}
          <div className="space-y-6 lg:col-span-4">
            <div className="sticky top-20 rounded-2xl border border-white/10 bg-surface-card p-6 shadow-xl">
              <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-4">
                Diagnóstico Comercial
              </h3>

              {/* Pontuação Hero com Tabular Nums */}
              <div className="rounded-xl border border-white/10 bg-surface-inset p-5 text-center">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Pontuação Total
                </span>
                <div className="mt-1 text-5xl font-black text-white tabular-nums tracking-tight">
                  {allFilled ? totalScore : '--'}
                  <span className="text-xl font-normal text-text-muted">/18</span>
                </div>
                <div className="mt-3">
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${priorityColor}`}>
                    {priorityLabel}
                  </span>
                </div>
              </div>

              {/* Checklist de Travas para Reunião com Closer */}
              <div className="mt-6 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary block">
                  Travas Obrigatórias do Closer:
                </span>
                <div className="space-y-2">
                  {gateChecks.map((check) => (
                    <div
                      key={check.label}
                      className="flex items-center justify-between rounded-lg border border-white/5 bg-surface-inset px-3 py-2 text-xs"
                    >
                      <span className="text-text-secondary">{check.label}</span>
                      {allFilled ? (
                        check.passed ? (
                          <CheckCircle2 className="h-4 w-4 text-status-success" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-status-danger" />
                        )
                      ) : (
                        <span className="text-[10px] text-text-muted">Pendente</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Card de Encaminhamento Recomendado */}
              <div className="mt-6 rounded-xl border border-white/10 bg-surface-inset p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted block mb-1">
                  Ação Recomendada:
                </span>
                {!allFilled ? (
                  <p className="text-xs text-text-muted italic">
                    Preencha as 6 notas no scorecard para calcular o encaminhamento automático.
                  </p>
                ) : allMinsPassed ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-status-success font-bold text-sm">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>Agendar Reunião com Closer</span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      Lead cumpre todos os critérios mínimos e atinge maturidade comercial para fechamento.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-status-warning font-bold text-sm">
                      <Clock className="h-4 w-4 shrink-0" />
                      <span>Combinar Retorno / Nutrir</span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      Não cumpre os critérios mínimos de reunião. Ajuste pendências ou programe follow-up futuro.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
