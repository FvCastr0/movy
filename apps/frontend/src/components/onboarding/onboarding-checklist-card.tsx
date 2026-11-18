'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import { Client } from '@/types';
import { ShieldCheck, CheckSquare, Square, Share2, Video, Globe, Smartphone, Sparkles } from 'lucide-react';

interface OnboardingChecklistCardProps {
  client: Client;
  onRefresh: () => void;
}

export function OnboardingChecklistCard({ client, onRefresh }: OnboardingChecklistCardProps) {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const toggleItem = async (key: string, currentValue: boolean) => {
    setLoadingKey(key);
    try {
      await api.patch(`/onboarding/${client.id}/checklist`, {
        [key]: !currentValue,
      });
      onRefresh();
    } catch (err) {
      alert('Falha ao atualizar checklist no servidor.');
    } finally {
      setLoadingKey(null);
    }
  };

  const items = [
    {
      key: 'metaAccessGranted',
      label: '1. Parceiro Meta Concedido',
      description: 'Acesso atribuído via Gerenciador de Negócios (sem senha pessoal)',
      icon: Share2,
      checked: client.metaAccessGranted || false,
    },
    {
      key: 'pageAccessGranted',
      label: '2. Página do Facebook Vinculada',
      description: 'Permissões para anúncios com a identidade da marca',
      icon: Globe,
      checked: client.pageAccessGranted || false,
    },
    {
      key: 'instagramAccessGranted',
      label: '3. Perfil do Instagram Conectado',
      description: 'Conta profissional vinculada para veiculação no feed/reels',
      icon: Smartphone,
      checked: client.instagramAccessGranted || false,
    },
    {
      key: 'pixelCreated',
      label: '4. Pixel / Conjunto de Dados Criado',
      description: 'Rastreamento de conversas e cliques no cardápio',
      icon: Sparkles,
      checked: client.pixelCreated || false,
    },
    {
      key: 'videosReceived',
      label: '5. Gravações Brutas Recebidas',
      description: 'Vídeos da operação, preparo e produtos enviados pelo restaurante',
      icon: Video,
      checked: client.videosReceived || false,
    },
    {
      key: 'creativesApproved',
      label: '6. Criativos & Edição Aprovados',
      description: 'Vídeos finais editados e validados pelo cliente antes do ar',
      icon: ShieldCheck,
      checked: client.creativesApproved || false,
    },
  ];

  const completedCount = items.filter((i) => i.checked).length;
  const progressPercent = Math.round((completedCount / items.length) * 100);

  return (
    <div className="rounded-xl border border-white/10 bg-surface-card p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-primary">Checklist de Implantação & Ativos</h2>
            <p className="text-xs text-text-muted">Processo oficial de liberação técnica e criativos (MOVY)</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-bold text-text-primary tabular-nums">
              {completedCount} de {items.length} concluídos
            </div>
            <div className="text-[10px] text-text-muted">{progressPercent}% pronto</div>
          </div>
          <div className="h-2 w-24 rounded-full bg-surface-canvas overflow-hidden border border-white/10">
            <div
              className="h-full bg-brand transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item) => {
          const Icon = item.icon;
          const isLoading = loadingKey === item.key;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => toggleItem(item.key, item.checked)}
              disabled={isLoading}
              className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-all ${
                item.checked
                  ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50'
                  : 'border-white/10 bg-surface-canvas hover:border-white/20'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {item.checked ? (
                  <CheckSquare className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Square className="h-4 w-4 text-text-muted" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Icon className={`h-3.5 w-3.5 ${item.checked ? 'text-emerald-400' : 'text-text-muted'}`} />
                  <span className={`text-xs font-bold ${item.checked ? 'text-emerald-400' : 'text-text-primary'}`}>
                    {item.label}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-text-muted line-clamp-1">
                  {item.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
