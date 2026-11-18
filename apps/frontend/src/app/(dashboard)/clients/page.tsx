'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Client, OnboardingStage } from '@/types';
import { OnboardingKanban } from '@/components/onboarding/onboarding-kanban';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Calendar, 
  BarChart3, 
  ArrowUpRight,
  TrendingUp,
  Search,
  CheckCircle2,
  Clock,
  Kanban,
  LayoutGrid
} from 'lucide-react';

export default function ClientsPage() {
  const [activeTab, setActiveTab] = useState<'cards' | 'onboarding'>('cards');
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadClients = async () => {
    try {
      setLoading(true);
      const res = await api.get<Client[]>('/clients');
      setClients(res.data);
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleStageChange = async (clientId: string, newStage: OnboardingStage) => {
    // Atualização otimista
    setClients((prev) =>
      prev.map((c) => (c.id === clientId ? { ...c, onboardingStage: newStage } : c))
    );
    try {
      await api.patch(`/onboarding/${clientId}/stage`, { stage: newStage });
    } catch (err) {
      console.error('Erro ao atualizar estágio de onboarding:', err);
      await loadClients();
    }
  };

  const filteredClients = clients.filter(
    (c) =>
      c.deliveryNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.segmento.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-2 sm:px-6">
        {/* Banner Superior */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-text-primary sm:text-3xl flex items-center gap-3">
              <Building2 className="h-8 w-8 text-brand" />
              Gestão de Clientes MOVY
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Pipeline de onboarding 48h, relatórios de tráfego Meta Ads e métricas operacionais.
            </p>
          </div>

          {/* Seletor de Abas: Clientes Ativos vs Tracker de Onboarding */}
          <div className="flex items-center gap-2 p-1 bg-surface-card border border-white/10 rounded-xl">
            <button
              onClick={() => setActiveTab('cards')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'cards'
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary hover:bg-white/5'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Clientes Ativos ({clients.length})
            </button>
            <button
              onClick={() => setActiveTab('onboarding')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'onboarding'
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary hover:bg-white/5'
              }`}
            >
              <Kanban className="w-4 h-4" />
              Tracker de Onboarding (48h)
            </button>
          </div>
        </div>

        {/* Conteúdo da Aba */}
        {activeTab === 'onboarding' ? (
          <div className="space-y-4">
            <OnboardingKanban clients={clients} onStageChange={handleStageChange} />
          </div>
        ) : (
          <>
            {/* Campo de Busca Rápida na visualização de cards */}
            <div className="mb-6 flex justify-end">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Buscar por delivery, cliente ou cidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-surface-card py-2 pl-9 pr-4 text-xs text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>

            {/* Listagem de Clientes */}
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-surface-card p-12 text-center">
                <Building2 className="mx-auto h-12 w-12 text-text-muted/40" />
                <h3 className="mt-4 text-base font-bold text-text-primary">Nenhum cliente ativo encontrado</h3>
                <p className="mt-1 text-sm text-text-muted">
                  Converta os leads fechados no CRM Comercial para iniciar a gestão operacional.
                </p>
                <Link
                  href="/crm"
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-hover transition-colors"
                >
                  Ir para o CRM Comercial
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredClients.map((client) => {
                  const latestReport = client.weeklyReports?.[0];
                  return (
                    <div
                      key={client.id}
                      className="group relative flex flex-col justify-between rounded-xl border border-white/10 bg-surface-card p-5 transition-all hover:border-brand/40 hover:shadow-lg hover:shadow-brand/5"
                    >
                      <div>
                        {/* Header do Card */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="inline-block rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                              {client.segmento}
                            </span>
                            <h2 className="text-lg font-bold text-text-primary group-hover:text-brand transition-colors">
                              {client.deliveryNome}
                            </h2>
                            <p className="text-xs text-text-secondary">{client.nome}</p>
                          </div>

                          <span className="inline-flex items-center gap-1 rounded-full bg-status-success/10 px-2 py-0.5 text-[10px] font-bold text-status-success border border-status-success/20">
                            <CheckCircle2 className="h-3 w-3" />
                            {client.status}
                          </span>
                        </div>

                        {/* Localidade e Contato */}
                        <div className="mt-4 flex flex-col gap-1.5 text-xs text-text-muted">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-text-muted/60" />
                            <span>{client.cidade}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-text-muted/60" />
                            <span>{client.whatsapp}</span>
                          </div>
                        </div>

                        {/* Resumo do Último Relatório */}
                        <div className="mt-5 rounded-lg border border-white/5 bg-surface-canvas/60 p-3">
                          <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center justify-between mb-2">
                            <span className="flex items-center gap-1">
                              <BarChart3 className="h-3 w-3 text-brand" />
                              Último Relatório Semanal
                            </span>
                            {latestReport?.whatsappSent && (
                              <span className="text-status-success text-[10px]">WhatsApp Enviado</span>
                            )}
                          </div>

                          {latestReport ? (
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-[10px] text-text-muted block">Gasto Meta</span>
                                <span className="font-bold text-text-primary">
                                  R$ {latestReport.metaSpend.toFixed(2)}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-text-muted block">Conversas</span>
                                <span className="font-bold text-status-success">
                                  {latestReport.metaConversas} chats
                                </span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[11px] text-text-muted italic flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Aguardando 1º relatório semanal
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Ação */}
                      <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between">
                        <span className="text-[10px] text-text-muted">
                          Conta Meta: {client.metaAdAccountId || 'Pendente'}
                        </span>
                        <Link
                          href={`/clients/${client.id}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:text-brand-hover group-hover:translate-x-0.5 transition-all"
                        >
                          Acessar Gestão
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
  );
}
