'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import { MetaCredentialsStatus } from '@/types';
import {
  ShieldCheck,
  Lock,
  Key,
  AlertTriangle,
  CheckCircle2,
  X,
  ExternalLink,
  Eye,
  EyeOff,
  Clock,
  Sparkles,
} from 'lucide-react';

interface MetaConfigModalProps {
  clientId: string;
  clientName: string;
  isOpen: boolean;
  statusInfo?: MetaCredentialsStatus | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function MetaConfigModal({
  clientId,
  clientName,
  isOpen,
  statusInfo,
  onClose,
  onSuccess,
}: MetaConfigModalProps) {
  const [adAccountId, setAdAccountId] = useState(statusInfo?.metaAdAccountId || '');
  const [accessToken, setAccessToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!adAccountId.trim() || !accessToken.trim()) {
      setError('Por favor, informe tanto o ID da Conta de Anúncios quanto o Token de Acesso.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post(`/meta-ads/clients/${clientId}/config`, {
        metaAdAccountId: adAccountId.trim(),
        accessToken: accessToken.trim(),
      });

      setSuccessMsg(`Conectado à conta "${res.data?.accountName || 'Meta Ads'}" com sucesso! Criptografado com AES-256.`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao validar credenciais na Meta Graph API.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-base">
                Credenciais Meta Ads — {clientName}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Criptografia AES-256-GCM em repouso no banco de dados.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Atual do Token */}
        {statusInfo && statusInfo.hasToken && (
          <div
            className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
              statusInfo.isExpired
                ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200'
                : statusInfo.isNearExpiry
                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200'
                : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200'
            }`}
          >
            <div className="flex items-center justify-between font-semibold">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                Ciclo do Token: {statusInfo.daysRemaining} dias restantes
              </span>
              <span className="uppercase text-[10px] tracking-wider font-bold px-2 py-0.5 rounded-full bg-white/40 dark:bg-black/20">
                {statusInfo.status}
              </span>
            </div>

            {statusInfo.isExpired ? (
              <p className="text-[11px] text-rose-700 dark:text-rose-300">
                O token de 60 dias expirou. Cole um novo token abaixo para restabelecer a sincronização.
              </p>
            ) : statusInfo.isNearExpiry ? (
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                Atenção: O token vence em menos de 10 dias. Recomendado renovar no Gerenciador da Meta.
              </p>
            ) : (
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                Conta conectada e token válido. Dados sincronizados com segurança.
              </p>
            )}
          </div>
        )}

        {/* Feedback Mensagens */}
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Formulário de Configuração */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              ID da Conta de Anúncios (Ad Account ID)
            </label>
            <input
              type="text"
              required
              placeholder="ex: act_1234567890 ou 1234567890"
              value={adAccountId}
              onChange={(e) => setAdAccountId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
            />
            <span className="text-[10px] text-gray-400 mt-0.5 block">
              Encontrado no Gerenciador de Anúncios da Meta.
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Token de Acesso da Meta (Access Token)
              </label>
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="text-[11px] text-brand-500 hover:text-brand-600 flex items-center gap-1"
              >
                {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showToken ? 'Ocultar' : 'Exibir'}
              </button>
            </div>
            <textarea
              rows={3}
              required
              placeholder="Cole o token (EAABw...) gerado na Graph API ou Business Manager"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              className={`w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono break-all ${
                !showToken ? 'filter blur-[3px] focus:filter-none transition-all' : ''
              }`}
            />
            <span className="text-[10px] text-gray-400 mt-0.5 block">
              O token será criptografado imediatamente e nunca trafegará em texto puro no navegador.
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
            <span className="text-[10px] text-gray-400 flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-500" />
              AES-256 Bidirecional
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-650 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-sm"
              >
                {isSubmitting ? 'Testando Conexão...' : 'Testar & Salvar'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
