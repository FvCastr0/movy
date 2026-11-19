'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  clearPortalSession,
  conciergePortalApi,
  DeliveryPortalUser,
  getPortalToken,
  getStoredPortalUser,
  HandoffQueueItem,
  PortalConversationMessage,
  PortalKnowledgeBase,
} from '@/lib/concierge-portal-api';
import {
  Bot,
  CheckCircle2,
  Clock,
  ExternalLink,
  LogOut,
  MessageSquareWarning,
  Power,
  RefreshCw,
  Save,
  Settings,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';

export default function ConciergeAttendantPortalPage() {
  const router = useRouter();
  const [user, setUser] = useState<DeliveryPortalUser | null>(null);
  const [activeTab, setActiveTab] = useState<'queue' | 'knowledge'>('queue');
  const [queue, setQueue] = useState<HandoffQueueItem[]>([]);
  const [kb, setKb] = useState<PortalKnowledgeBase | null>(null);
  const [aiGlobalEnabled, setAiGlobalEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [savingQuickOps, setSavingQuickOps] = useState(false);
  const [savingFullKb, setSavingFullKb] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Quick-Ops State
  const [deliveryMins, setDeliveryMins] = useState(45);
  const [pickupMins, setPickupMins] = useState(25);
  const [dailyNotice, setDailyNotice] = useState('');

  // Modal de Histórico de Mensagens (Contexto para o Atendente)
  const [selectedConv, setSelectedConv] = useState<{
    id: string;
    customerName: string;
    customerPhone: string;
    whatsappDeepLink: string;
    handoffReason: string | null;
    messages: PortalConversationMessage[];
  } | null>(null);

  const loadDashboardData = useCallback(async () => {
    const token = getPortalToken();
    if (!token) {
      router.push('/concierge-portal/login');
      return;
    }

    try {
      setLoading(true);
      const [meRes, queueRes, kbRes] = await Promise.all([
        conciergePortalApi.getMe(),
        conciergePortalApi.getHandoffQueue(),
        conciergePortalApi.getKnowledgeBase(),
      ]);

      setUser(meRes);
      setQueue(queueRes);
      setAiGlobalEnabled(kbRes.aiGlobalEnabled);
      setKb(kbRes.knowledgeBase);

      setDeliveryMins(kbRes.knowledgeBase.estimatedDeliveryMinutes);
      setPickupMins(kbRes.knowledgeBase.estimatedPickupMinutes);
      setDailyNotice(kbRes.knowledgeBase.customInstructions || '');
    } catch {
      router.push('/concierge-portal/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const cached = getStoredPortalUser();
    if (cached) {
      setUser(cached);
    }
    loadDashboardData();
  }, [loadDashboardData]);

  // Polling leve da fila de transbordo a cada 15s apenas quando a aba estiver visível
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && getPortalToken()) {
        conciergePortalApi
          .getHandoffQueue()
          .then(setQueue)
          .catch(() => undefined);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleGlobalAi = async () => {
    const nextState = !aiGlobalEnabled;
    try {
      setSavingQuickOps(true);
      const res = await conciergePortalApi.updateQuickOps({
        aiGlobalEnabled: nextState,
      });
      setAiGlobalEnabled(res.aiGlobalEnabled);
      setFeedback(
        res.aiGlobalEnabled
          ? 'IA reativada para novos atendimentos no WhatsApp!'
          : 'IA pausada globalmente. Todos os clientes serão atendidos pela equipe humana.',
      );
    } catch (err: any) {
      setFeedback(err?.message || 'Erro ao alterar status da IA.');
    } finally {
      setSavingQuickOps(false);
    }
  };

  const handleSaveQuickOps = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingQuickOps(true);
      setFeedback(null);
      const res = await conciergePortalApi.updateQuickOps({
        estimatedDeliveryMinutes: Number(deliveryMins),
        estimatedPickupMinutes: Number(pickupMins),
        customInstructions: dailyNotice,
      });
      setKb(res.knowledgeBase);
      setFeedback(
        'Prazos e avisos do dia atualizados! A IA já está respondendo com as novas informações.',
      );
    } catch (err: any) {
      setFeedback(err?.message || 'Erro ao salvar operação do dia.');
    } finally {
      setSavingQuickOps(false);
    }
  };

  const handleResolveConversation = async (conversationId: string) => {
    try {
      setResolvingId(conversationId);
      await conciergePortalApi.resolveAndReturnToAi(conversationId);
      setQueue((prev) => prev.filter((item) => item.id !== conversationId));
      if (selectedConv?.id === conversationId) {
        setSelectedConv(null);
      }
    } catch (err: any) {
      setFeedback(err?.message || 'Não foi possível devolver conversa para a IA.');
    } finally {
      setResolvingId(null);
    }
  };

  const handleOpenHistoryModal = async (item: HandoffQueueItem) => {
    try {
      const detail = await conciergePortalApi.getConversationDetail(item.id);
      setSelectedConv({
        id: detail.id,
        customerName: detail.customerName || detail.customerPhone,
        customerPhone: detail.customerPhone,
        whatsappDeepLink: detail.whatsappDeepLink,
        handoffReason: detail.handoffReason,
        messages: detail.messages,
      });
    } catch (err: any) {
      setFeedback(err?.message || 'Erro ao carregar mensagens da conversa.');
    }
  };

  const handleSaveFullKb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kb) return;
    try {
      setSavingFullKb(true);
      setFeedback(null);
      const res = await conciergePortalApi.updateFullKnowledgeBase({
        digitalMenuUrl: kb.digitalMenuUrl,
        openingHoursText: kb.openingHoursText,
        estimatedDeliveryMinutes: Number(kb.estimatedDeliveryMinutes),
        estimatedPickupMinutes: Number(kb.estimatedPickupMinutes),
        deliveryFeeRules: kb.deliveryFeeRules,
        paymentMethods: kb.paymentMethods,
        agentName: kb.agentName,
        toneOfVoice: kb.toneOfVoice,
        llmProvider: kb.llmProvider,
        llmModel: kb.llmModel,
        customInstructions: kb.customInstructions,
        handoffTriggers: kb.handoffTriggers,
      });
      setKb(res.knowledgeBase);
      setDeliveryMins(res.knowledgeBase.estimatedDeliveryMinutes);
      setPickupMins(res.knowledgeBase.estimatedPickupMinutes);
      setDailyNotice(res.knowledgeBase.customInstructions || '');
      setFeedback('Base de conhecimento e regras da IA salvas com sucesso!');
    } catch (err: any) {
      setFeedback(err?.message || 'Erro ao atualizar base de conhecimento.');
    } finally {
      setSavingFullKb(false);
    }
  };

  const handleLogout = () => {
    clearPortalSession();
    router.push('/concierge-portal/login');
  };

  if (loading && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-canvas">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-canvas text-text-primary pb-16">
      {/* Topbar do Delivery */}
      <header className="border-b border-white/10 bg-surface-card/80 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/15 border border-brand/30 text-brand">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-extrabold text-text-primary">
                  {user?.tenantName || 'Painel do Delivery'}
                </h1>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                    aiGlobalEnabled
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {aiGlobalEnabled ? 'IA Respondendo' : 'IA Pausada'}
                </span>
              </div>
              <p className="text-[11px] text-text-muted">
                Operador: {user?.name} ({user?.role === 'OWNER' ? 'Gestor' : 'Atendente'}) • WhatsApp Coexistence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleGlobalAi}
              disabled={savingQuickOps}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                aiGlobalEnabled
                  ? 'border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                  : 'bg-emerald-500 text-black hover:brightness-110'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              {aiGlobalEnabled ? 'Pausar IA Geral' : 'Ativar IA Geral'}
            </button>

            <button
              type="button"
              onClick={loadDashboardData}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-text-primary hover:bg-white/10"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Atualizar
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-text-muted hover:text-white"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        {feedback && (
          <div className="flex items-center justify-between rounded-xl border border-brand/30 bg-brand/10 px-4 py-2.5 text-xs text-text-primary">
            <span>{feedback}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-text-muted hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Barra de Operação Rápida do Dia (Quick-Ops) */}
        <section className="rounded-2xl border border-white/10 bg-surface-card p-5">
          <form
            onSubmit={handleSaveQuickOps}
            className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end"
          >
            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold text-text-muted mb-1">
                Tempo Entrega Hoje (min)
              </label>
              <input
                type="number"
                min={10}
                max={240}
                value={deliveryMins}
                onChange={(e) => setDeliveryMins(Number(e.target.value))}
                className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-xs font-bold text-white focus:border-brand focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold text-text-muted mb-1">
                Tempo Retirada Hoje (min)
              </label>
              <input
                type="number"
                min={5}
                max={180}
                value={pickupMins}
                onChange={(e) => setPickupMins(Number(e.target.value))}
                className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-xs font-bold text-white focus:border-brand focus:outline-none"
              />
            </div>

            <div className="md:col-span-6">
              <label className="block text-[11px] font-semibold text-text-muted mb-1">
                Aviso do Dia / Promoção Ativa / Item em Falta (A IA usará nas respostas de hoje)
              </label>
              <input
                type="text"
                maxLength={500}
                placeholder="Ex: Hoje combo duplo por R$ 34,90 | Estamos sem Coca-Cola lata"
                value={dailyNotice}
                onChange={(e) => setDailyNotice(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black/40 px-3.5 py-2 text-xs text-white focus:border-brand focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={savingQuickOps}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-black hover:brightness-110 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                Salvar Hoje
              </button>
            </div>
          </form>
        </section>

        {/* Seletor de Abas (Fila de Transbordo vs Base de Conhecimento para OWNER) */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('queue')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === 'queue'
                ? 'bg-brand text-black'
                : 'bg-white/5 text-text-muted hover:text-white'
            }`}
          >
            <MessageSquareWarning className="w-4 h-4" />
            Fila de Transbordo Humano ({queue.length})
          </button>

          {user?.role === 'OWNER' && (
            <button
              type="button"
              onClick={() => setActiveTab('knowledge')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === 'knowledge'
                  ? 'bg-brand text-black'
                  : 'bg-white/5 text-text-muted hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              Cardápio Digital & Regras da IA
            </button>
          )}
        </div>

        {/* ABA 1: Fila de Transbordo Prioritária (HUMAN_HANDOFF) */}
        {activeTab === 'queue' && (
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-text-primary">
                  Clientes Aguardando Atendimento Humano no WhatsApp
                </h2>
                <p className="text-xs text-text-muted">
                  A IA já respondeu o restante e enviou o cardápio. Aqui aparecem apenas os casos que exigem um atendente humano.
                </p>
              </div>
            </div>

            {queue.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-surface-card p-10 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-text-primary">
                  Nenhum cliente pendente na fila humana!
                </h3>
                <p className="text-xs text-text-muted max-w-md mx-auto">
                  A IA está respondendo dúvidas e enviando o link do cardápio digital automaticamente. Quando alguém precisar de um atendente humano, aparecerá aqui com alerta.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {queue.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-amber-500/30 bg-surface-card p-5 space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-extrabold text-text-primary">
                            {item.customerName}
                          </h3>
                          <p className="text-xs text-text-muted">
                            WhatsApp: +{item.customerPhone}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-300 border border-amber-500/30">
                          <Clock className="w-3 h-3" />
                          IA Pausada p/ este Contato
                        </span>
                      </div>

                      {/* Motivo e Resumo gerado pela IA */}
                      <div className="rounded-xl border border-white/10 bg-black/30 p-3.5 space-y-1.5">
                        <p className="text-xs font-bold text-amber-300">
                          Motivo: {item.handoffReason || 'Solicitou ajuda humana'}
                        </p>
                        {item.handoffSummary && (
                          <p className="text-xs text-text-muted">
                            {item.handoffSummary}
                          </p>
                        )}
                      </div>

                      {/* Últimas mensagens para contexto rápido */}
                      {item.recentMessages && item.recentMessages.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-semibold text-text-muted">
                            Últimas mensagens:
                          </p>
                          {item.recentMessages.map((m) => (
                            <div
                              key={m.id}
                              className="rounded-lg bg-white/5 px-3 py-1.5 text-xs flex items-start gap-2"
                            >
                              <span className="font-bold text-[10px] uppercase text-brand shrink-0 mt-0.5">
                                {m.senderType === 'CUSTOMER'
                                  ? 'Cliente:'
                                  : m.senderType === 'AI_AGENT'
                                    ? 'IA:'
                                    : 'Atendente:'}
                              </span>
                              <span className="text-text-primary line-clamp-2">
                                {m.content}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => handleOpenHistoryModal(item)}
                        className="text-xs font-semibold text-text-muted hover:text-white underline"
                      >
                        Ver conversa completa
                      </button>

                      <div className="flex items-center gap-2">
                        <a
                          href={item.whatsappDeepLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-bold text-black hover:brightness-110 transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Responder no WhatsApp
                        </a>

                        <button
                          type="button"
                          disabled={resolvingId === item.id}
                          onClick={() => handleResolveConversation(item.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-bold text-text-primary hover:bg-white/10 transition disabled:opacity-50"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-brand" />
                          {resolvingId === item.id
                            ? 'Devolvendo...'
                            : 'Resolvido (Voltar p/ IA)'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ABA 2: Base de Conhecimento & Regras da IA (Exclusivo OWNER) */}
        {activeTab === 'knowledge' && kb && user?.role === 'OWNER' && (
          <section className="rounded-2xl border border-white/10 bg-surface-card p-6">
            <form onSubmit={handleSaveFullKb} className="space-y-4">
              <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                <Sparkles className="w-5 h-5 text-brand" />
                <div>
                  <h2 className="text-sm font-bold text-text-primary">
                    Configurações do Cardápio Digital & Comportamento da IA
                  </h2>
                  <p className="text-xs text-text-muted">
                    Configure as informações oficiais que o agente usa para tirar dúvidas e direcionar pedidos.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    Link Oficial do Cardápio Digital (HTTPS)
                  </label>
                  <input
                    type="url"
                    required
                    value={kb.digitalMenuUrl}
                    onChange={(e) =>
                      setKb({ ...kb, digitalMenuUrl: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/15 bg-black/40 px-3.5 py-2 text-xs text-white focus:border-brand focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    Nome do Assistente Virtual no WhatsApp
                  </label>
                  <input
                    type="text"
                    required
                    value={kb.agentName}
                    onChange={(e) =>
                      setKb({ ...kb, agentName: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/15 bg-black/40 px-3.5 py-2 text-xs text-white focus:border-brand focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    Horário de Funcionamento
                  </label>
                  <input
                    type="text"
                    required
                    value={kb.openingHoursText}
                    onChange={(e) =>
                      setKb({ ...kb, openingHoursText: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/15 bg-black/40 px-3.5 py-2 text-xs text-white focus:border-brand focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    Formas de Pagamento Aceitas
                  </label>
                  <input
                    type="text"
                    required
                    value={kb.paymentMethods}
                    onChange={(e) =>
                      setKb({ ...kb, paymentMethods: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/15 bg-black/40 px-3.5 py-2 text-xs text-white focus:border-brand focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Regras de Taxa de Entrega e Bairros Atendidos
                </label>
                <textarea
                  rows={2}
                  required
                  value={kb.deliveryFeeRules}
                  onChange={(e) =>
                    setKb({ ...kb, deliveryFeeRules: e.target.value })
                  }
                  className="w-full rounded-xl border border-white/15 bg-black/40 px-3.5 py-2 text-xs text-white focus:border-brand focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    Tom de Voz Humanizado
                  </label>
                  <input
                    type="text"
                    required
                    value={kb.toneOfVoice}
                    onChange={(e) =>
                      setKb({ ...kb, toneOfVoice: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/15 bg-black/40 px-3.5 py-2 text-xs text-white focus:border-brand focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    Modelo de IA Econômico Homologado
                  </label>
                  <select
                    value={kb.llmModel}
                    onChange={(e) => {
                      const nextModel = e.target
                        .value as PortalKnowledgeBase['llmModel'];
                      const nextProvider = nextModel.startsWith('gemini')
                        ? 'GEMINI'
                        : 'OPENAI';
                      setKb({
                        ...kb,
                        llmModel: nextModel,
                        llmProvider: nextProvider,
                      });
                    }}
                    className="w-full rounded-xl border border-white/15 bg-black/40 px-3.5 py-2 text-xs text-white focus:border-brand focus:outline-none"
                  >
                    <option value="gpt-4o-mini">
                      OpenAI GPT-4o Mini (Ultra Rápido & Econômico)
                    </option>
                    <option value="gemini-2.5-flash">
                      Google Gemini 2.5 Flash (Humanizado & Baixo Custo)
                    </option>
                    <option value="gemini-2.0-flash">
                      Google Gemini 2.0 Flash
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Quando transferir para um Atendente Humano? (Gatilhos de Transbordo)
                </label>
                <textarea
                  rows={2}
                  value={kb.handoffTriggers}
                  onChange={(e) =>
                    setKb({ ...kb, handoffTriggers: e.target.value })
                  }
                  className="w-full rounded-xl border border-white/15 bg-black/40 px-3.5 py-2 text-xs text-white focus:border-brand focus:outline-none"
                />
              </div>

              <div className="flex justify-end pt-3 border-t border-white/10">
                <button
                  type="submit"
                  disabled={savingFullKb}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-black hover:brightness-110 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {savingFullKb
                    ? 'Salvando Configurações...'
                    : 'Salvar Base de Conhecimento'}
                </button>
              </div>
            </form>
          </section>
        )}
      </main>

      {/* Modal de Histórico de Mensagens da Conversa */}
      {selectedConv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-surface-card p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h4 className="text-sm font-bold text-text-primary">
                  Contexto da Conversa — {selectedConv.customerName}
                </h4>
                <p className="text-xs text-text-muted">
                  +{selectedConv.customerPhone} • {selectedConv.handoffReason}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedConv(null)}
                className="rounded-lg p-1 text-text-muted hover:bg-white/10 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {selectedConv.messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-xl p-3 text-xs space-y-1 ${
                    m.senderType === 'CUSTOMER'
                      ? 'bg-white/5 border border-white/10'
                      : m.senderType === 'AI_AGENT'
                        ? 'bg-brand/10 border border-brand/25'
                        : 'bg-emerald-500/10 border border-emerald-500/25'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase text-text-muted">
                    <span>
                      {m.senderType === 'CUSTOMER'
                        ? 'Cliente'
                        : m.senderType === 'AI_AGENT'
                          ? 'IA Concierge'
                          : 'Atendente Humano (WhatsApp Business)'}
                    </span>
                    <span>
                      {new Date(m.createdAt).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-text-primary whitespace-pre-wrap">
                    {m.content}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/10">
              <a
                href={selectedConv.whatsappDeepLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-black hover:brightness-110"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Abrir no WhatsApp Business
              </a>
              <button
                type="button"
                onClick={() => handleResolveConversation(selectedConv.id)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-black hover:brightness-110"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Resolvido / Devolver p/ IA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
