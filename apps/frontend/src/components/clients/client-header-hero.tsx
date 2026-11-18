'use client';

import React from 'react';
import Link from 'next/link';
import { Client } from '@/types';
import {
  Building2,
  MapPin,
  Phone,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Edit,
  ExternalLink,
} from 'lucide-react';

interface ClientHeaderHeroProps {
  client: Client;
  onOpenContractModal: () => void;
}

export function ClientHeaderHero({ client, onOpenContractModal }: ClientHeaderHeroProps) {
  const cleanPhone = client.whatsapp.replace(/\D/g, '');
  const waUrl = `https://wa.me/${cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`}`;

  const formatCurrency = (val?: number | null) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(
      val || 0
    );
  };

  return (
    <div className="space-y-4">
      {/* Voltar */}
      <Link
        href="/clients"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar para Clientes Ativos
      </Link>

      {/* Hero Card */}
      <div className="rounded-2xl border border-white/10 bg-surface-card p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Identificação do Delivery */}
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand/10 border border-brand/20 text-brand font-black text-2xl shadow-sm">
              {client.deliveryNome.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-black text-text-primary tracking-tight">
                  {client.deliveryNome}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-status-success/15 px-2.5 py-0.5 text-xs font-bold text-status-success border border-status-success/30">
                  <CheckCircle2 className="h-3 w-3" />
                  {client.status}
                </span>
                <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs font-semibold text-text-muted uppercase">
                  {client.segmento}
                </span>
              </div>

              <p className="mt-1 text-xs text-text-secondary">
                Responsável: <strong className="text-text-primary">{client.nome}</strong> • {client.cidade}
              </p>

              <div className="mt-2 flex items-center gap-3 text-xs">
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>{client.whatsapp}</span>
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
              </div>
            </div>
          </div>

          {/* Bloco de Contrato & Cobrança */}
          <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl border border-white/10 bg-surface-canvas">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                Plano Contratual
              </span>
              <div className="mt-1 flex items-center gap-2">
                <span className="rounded bg-brand/15 px-2 py-0.5 text-xs font-bold text-brand uppercase">
                  {client.contract?.cycle || 'Trimestral'}
                </span>
                <span className="text-xs font-bold text-text-primary">
                  {client.contract ? formatCurrency(client.contract.totalValue) : '-'}
                </span>
              </div>
            </div>

            <div className="border-l border-white/10 pl-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                MRR Contábil
              </span>
              <div className="mt-1 text-xs font-bold text-text-primary">
                {client.contract ? `${formatCurrency(client.contract.mrrEquivalent)}/mês` : '-'}
              </div>
            </div>

            <div className="border-l border-white/10 pl-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                Status Pagamento
              </span>
              <div className="mt-1">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    client.contract?.paymentStatus === 'EM_DIA'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : client.contract?.paymentStatus === 'INADIMPLENTE'
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {client.contract?.paymentStatus === 'EM_DIA'
                    ? 'Em dia'
                    : client.contract?.paymentStatus === 'INADIMPLENTE'
                    ? 'Inadimplente'
                    : 'Pendente'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenContractModal}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors border border-white/10"
              title="Gerenciar contrato financeiro"
            >
              <Edit className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
