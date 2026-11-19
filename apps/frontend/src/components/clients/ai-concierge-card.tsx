'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  Client,
  ClientConciergeSummary,
  SyncClientConciergeInput,
} from '@/types';
import {
  Bot,
  MessageSquare,
  Zap,
  ExternalLink,
  UserCheck,
  Coins,
  Settings2,
  Power,
  AlertTriangle,
  CheckCircle2,
  X,
  ShieldCheck,
} from 'lucide-react';

interface AiConciergeCardProps {
  client: Client;
  onUpdated?: () => void;
}

const USD_TO_BRL_RATE = 5.8;

export function AiConciergeCard({ client, onUpdated }: AiConciergeCardProps) {
  const [summary, setSummary] = useState<ClientConciergeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Campos do Modal de Provisionamento S2S
  const [digitalMenuUrl, setDigitalMenuUrl] = useState(
    client.conciergeDigitalMenuUrl || '',
  );
  const [wabaId, setWabaId] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [metaAccessToken, setMetaAccessToken] = useState('');
  const [ownerEmail, setOwnerEmail] = useState(
    client.conciergeOwnerEmail || '',
  );
  const [ownerName, setOwnerName] = useState(client.nome || '');
  const [ownerPassword, setOwnerPassword] = useState('');

  const loadConciergeSummary = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<ClientConciergeSummary>(
        `/clients/${client.id}/concierge/summary`,
      );
      setSummary(res.data);
      if (res.data.digitalMenuUrl) {
        setDigitalMenuUrl(res.data.digitalMenuUrl);
      }
      if (res.data.wabaId) {
        setWabaId(res.data.wabaId);
      }
      if (res.data.phoneNumberId) {
        setPhoneNumberId(res.data.phoneNumberId);
      }
      if (res.data.ownerEmail) {
        setOwnerEmail(res.data.ownerEmail);
      }
    } catch (err) {
      console.error('Erro ao carregar resumo do AI Concierge:', err);
    } finally {
      setLoading(false);
    }
  }, [client.id]);

  useEffect(() => {
    loadConciergeSummary();
  }, [loadConciergeSummary]);

  const handleToggleEnabled = async () => {
    const nextEnabled = !(summary?.enabled ?? client.aiConciergeEnabled);
    try {
      setToggling(true);
      setFeedbackError(null);
      await api.post(`/clients/${client.id}/concierge/sync`, {
        enabled: nextEnabled,
      } satisfies SyncClientConciergeInput);
      await loadConciergeSummary();
      onUpdated?.();
    } catch (err: any) {
      setFeedbackError(
        err?.response?.data?.message ||
          'Não foi possível alterar o status do AI Concierge.',
      );
    } finally {
      setToggling(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingConfig(true);
      setFeedbackError(null);

      const payload: SyncClientConciergeInput = {
        enabled: true,
        ...(digitalMenuUrl.trim()
          ? { digitalMenuUrl: digitalMenuUrl.trim() }
          : {}),
        ...(wabaId.trim() ? { wabaId: wabaId.trim() } : {}),
        ...(phoneNumberId.trim()
          ? { phoneNumberId: phoneNumberId.trim() }
          : {}),
        ...(metaAccessToken.trim()
          ? { metaAccessToken: metaAccessToken.trim() }
          : {}),
        ...(ownerEmail.trim() ? { ownerEmail: ownerEmail.trim() } : {}),
        ...(ownerName.trim() ? { ownerName: ownerName.trim() } : {}),
        ...(ownerPassword.trim() ? { ownerPassword: ownerPassword.trim() } : {}),
      };

      await api.post(`/clients/${client.id}/concierge/sync`, payload);
      setMetaAccessToken('');
      setOwnerPassword('');
      setIsModalOpen(false);
      await loadConciergeSummary();
      onUpdated?.();
    } catch (err: any) {
      setFeedbackError(
        err?.response?.data?.message ||
          'Erro ao sincronizar configurações com o microserviço de IA.',
      );
    } finally {
      setSavingConfig(false);
    }
  };

  const isEnabled = Boolean(summary?.enabled ?? client.aiConciergeEnabled);
  const metrics = summary?.metrics;

  const avgResponseSeconds =
    metrics && metrics.avgFirstResponseMs > 0
      ? (metrics.avgFirstResponseMs / 1000).toFixed(1)
      : '0.0';

  const menuConversionPercent =
    metrics && metrics.totalConversations > 0
      ? Math.round(
          (metrics.menuLinkSentCount / metrics.totalConversations) * 100,
        )
      : 0;

  const costUsd = metrics?.estimatedCostUsd || 0;
  const costBrl = costUsd * USD_TO_BRL_RATE;

  return (
    <div className="rounded-2xl border border-white/10 bg-surface-card p-6 space-y-5">
      {/* Header do Módulo AI Concierge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/15 border border-brand/30 text-brand">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-text-primary">
                AI Concierge WhatsApp (Meta Coexistence)
              </h3>
              {isEnabled ? (
                summary?.serviceAvailable === false ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300 border border-amber-500/30">
                    <AlertTriangle className="w-3 h-3" />
                    Microserviço Offline
                  </span>
                ) : summary?.aiGlobalEnabled === false ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300 border border-amber-500/30">
                    Pausado pelo Delivery
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" />
                    IA Ativa ({summary?.knowledgeBase?.llmModel || 'gpt-4o-mini'})
                  </span>
                )
              ) : (
                <span className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-text-muted border border-white/10">
                  Não Utiliza neste Contrato
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-1">
              Triagem automática humanizada, envio de cardápio digital e transbordo inteligente via microserviço isolado.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isEnabled && (
            <a
              href="/concierge-portal/login"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-text-primary hover:bg-white/10 transition"
            >
              <ExternalLink className="w-3.5 h-3.5 text-brand" />
              Portal do Atendente
            </a>
          )}
          <button
            type="button"
            onClick={() => {
              setFeedbackError(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-text-primary hover:bg-white/10 transition"
          >
            <Settings2 className="w-3.5 h-3.5 text-brand" />
            Configurar IA & Acesso
          </button>

          <button
            type="button"
            disabled={toggling}
            onClick={handleToggleEnabled}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              isEnabled
                ? 'border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
                : 'bg-brand text-black hover:brightness-110'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            {toggling
              ? 'Sincronizando...'
              : isEnabled
                ? 'Desabilitar Concierge'
                : 'Habilitar AI Concierge'}
          </button>
        </div>
      </div>

      {feedbackError && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-200">
          {feedbackError}
        </div>
      )}

      {/* Estado Desabilitado */}
      {!isEnabled ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-text-primary">
              Este delivery ainda não utiliza o módulo de Atendimento WhatsApp com IA.
            </p>
            <p className="text-xs text-text-muted">
              Caso o cliente contrate ou receba o AI Concierge, clique em &ldquo;Habilitar AI Concierge&rdquo; ou configure o link do cardápio e acesso do atendente.
            </p>
          </div>
        </div>
      ) : loading && !summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl bg-white/5 border border-white/5"
            />
          ))}
        </div>
      ) : (
        <>
          {/* Grid Executivo com as 5 Métricas Sincronizadas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* Métrica 1: Total de Conversas Atendidas */}
            <div className="rounded-xl border border-white/10 bg-black/25 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>Conversas Atendidas</span>
                <MessageSquare className="w-4 h-4 text-brand" />
              </div>
              <p className="text-2xl font-extrabold text-text-primary">
                {metrics?.totalConversations ?? 0}
              </p>
              <p className="text-[11px] text-text-muted">
                {summary?.hasMetaCredentials
                  ? 'Coexistence Cloud API Conectado'
                  : 'Aguardando Token Meta Cloud'}
              </p>
            </div>

            {/* Métrica 2: Tempo Médio de 1ª Resposta */}
            <div className="rounded-xl border border-white/10 bg-black/25 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>Tempo 1ª Resposta</span>
                <Zap className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-extrabold text-emerald-400">
                {avgResponseSeconds}s
              </p>
              <p className="text-[11px] text-text-muted">
                Meta de SLA: &lt; 5,0 segundos
              </p>
            </div>

            {/* Métrica 3: Envios do Link do Cardápio Digital */}
            <div className="rounded-xl border border-white/10 bg-black/25 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>Envios do Cardápio</span>
                <ExternalLink className="w-4 h-4 text-sky-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-extrabold text-text-primary">
                  {metrics?.menuLinkSentCount ?? 0}
                </p>
                <span className="text-xs font-semibold text-sky-400">
                  ({menuConversionPercent}%)
                </span>
              </div>
              <p className="text-[11px] text-text-muted truncate">
                {summary?.digitalMenuUrl || 'Cardápio padrão configurado'}
              </p>
            </div>

            {/* Métrica 4: Taxa de Retenção da IA vs Transbordo Humano */}
            <div className="rounded-xl border border-white/10 bg-black/25 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>Retenção IA vs Humano</span>
                <UserCheck className="w-4 h-4 text-violet-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-extrabold text-text-primary">
                  {metrics?.aiRetentionRatePercent ?? 0}%
                </p>
                <span className="text-[11px] text-text-muted">
                  ({metrics?.aiResolvedCount ?? 0} IA /{' '}
                  {metrics?.humanHandoffCount ?? 0} Hum.)
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-brand transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      metrics?.aiRetentionRatePercent ?? 0,
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Métrica 5: Consumo de Tokens & Custo Estimado do Modelo Econômico */}
            <div className="rounded-xl border border-white/10 bg-black/25 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>Custo IA Econômica</span>
                <Coins className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-extrabold text-text-primary">
                  R$ {costBrl.toFixed(2)}
                </p>
                <span className="text-[11px] text-text-muted">
                  (${costUsd.toFixed(4)})
                </span>
              </div>
              <p className="text-[11px] text-text-muted">
                {(metrics?.totalTokens ?? 0).toLocaleString('pt-BR')} tokens (
                {summary?.knowledgeBase?.llmModel || 'gpt-4o-mini'})
              </p>
            </div>
          </div>

          {/* Rodapé informativo do Tenant */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] text-text-muted">
            <div className="flex flex-wrap items-center gap-4">
              <span>
                <strong className="text-text-primary">Acesso do Delivery:</strong>{' '}
                {summary?.ownerEmail || 'Não configurado'}
              </span>
              {summary?.knowledgeBase && (
                <span>
                  <strong className="text-text-primary">Prazo do Dia:</strong>{' '}
                  Entrega ~{summary.knowledgeBase.estimatedDeliveryMinutes}m |
                  Retirada ~{summary.knowledgeBase.estimatedPickupMinutes}m
                </span>
              )}
            </div>
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              Isolamento S2S + OWASP Hardened
            </span>
          </div>
        </>
      )}

      {/* Modal de Provisionamento & Configuração S2S */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-surface-card p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-brand" />
                <h4 className="text-sm font-bold text-text-primary">
                  Configurar AI Concierge — {client.deliveryNome}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-text-muted hover:bg-white/10 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Link Oficial do Cardápio Digital (Obrigatório HTTPS)
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://cardapio.anota.ai/seu-delivery"
                  value={digitalMenuUrl}
                  onChange={(e) => setDigitalMenuUrl(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-black/40 px-3.5 py-2 text-xs text-white focus:border-brand focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    Meta WABA ID (Coexistence)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 1092837465123"
                    value={wabaId}
                    onChange={(e) => setWabaId(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-black/40 px-3.5 py-2 text-xs text-white focus:border-brand focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    Meta Phone Number ID
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 1209384756102"
                    value={phoneNumberId}
                    onChange={(e) => setPhoneNumberId(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-black/40 px-3.5 py-2 text-xs text-white focus:border-brand focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Meta Cloud API Access Token (Cifrado com AES-256-GCM)
                </label>
                <input
                  type="password"
                  placeholder={
                    summary?.hasMetaCredentials
                      ? '•••••••• (Já configurado — preencha apenas para substituir)'
                      : 'EAAGm0PX4ZCpsBA...'
                  }
                  value={metaAccessToken}
                  onChange={(e) => setMetaAccessToken(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-black/40 px-3.5 py-2 text-xs text-white focus:border-brand focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-white/10 space-y-3">
                <p className="text-xs font-bold text-text-primary">
                  Credenciais do Portal do Atendente do Delivery
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-text-muted mb-1">
                      Nome do Responsável
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Carlos (Gerente)"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-black/40 px-3.5 py-2 text-xs text-white focus:border-brand focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-text-muted mb-1">
                      E-mail de Login do Delivery
                    </label>
                    <input
                      type="email"
                      placeholder="atendimento@delivery.com.br"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-black/40 px-3.5 py-2 text-xs text-white focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] text-text-muted mb-1">
                    Senha Inicial / Redefinir Senha (mín. 8 caracteres, bcrypt 12 rounds)
                  </label>
                  <input
                    type="password"
                    minLength={8}
                    placeholder="Deixe em branco para manter a senha atual"
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-black/40 px-3.5 py-2 text-xs text-white focus:border-brand focus:outline-none"
                  />
                </div>
              </div>

              {feedbackError && (
                <p className="text-xs text-rose-400">{feedbackError}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-text-muted hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-black hover:brightness-110 disabled:opacity-50"
                >
                  {savingConfig
                    ? 'Sincronizando S2S...'
                    : 'Salvar & Ativar no Microserviço'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
