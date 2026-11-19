'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { conciergePortalApi } from '@/lib/concierge-portal-api';
import { Bot, Lock, Mail, ShieldCheck, AlertCircle } from 'lucide-react';

export default function ConciergePortalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await conciergePortalApi.login(email, password);
      router.push('/concierge-portal');
    } catch (err: any) {
      setError(err?.message || 'Falha ao autenticar no Portal do Delivery.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-canvas text-text-primary flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-surface-card p-8 space-y-6 shadow-2xl">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/15 border border-brand/30 text-brand">
            <Bot className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-extrabold text-text-primary">
            MOVY AI Concierge — Portal do Delivery
          </h1>
          <p className="text-xs text-text-muted">
            Fila de Transbordo Inteligente & Controle Operacional do WhatsApp Business (Coexistence)
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              E-mail do Atendente ou Gestor do Delivery
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-text-muted absolute left-3.5 top-2.5" />
              <input
                type="email"
                required
                placeholder="atendimento@seudelivery.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black/40 pl-10 pr-3.5 py-2 text-xs text-white focus:border-brand focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              Senha de Acesso
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-text-muted absolute left-3.5 top-2.5" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black/40 pl-10 pr-3.5 py-2 text-xs text-white focus:border-brand focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand py-2.5 text-xs font-bold text-black hover:brightness-110 transition disabled:opacity-50"
          >
            {loading ? 'Autenticando...' : 'Entrar no Painel do Delivery'}
          </button>
        </form>

        <div className="pt-4 border-t border-white/10 flex items-center justify-center gap-1.5 text-[11px] text-text-muted">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Protegido por Rate Limit & Isolamento Multi-Tenant OWASP</span>
        </div>
      </div>
    </div>
  );
}
