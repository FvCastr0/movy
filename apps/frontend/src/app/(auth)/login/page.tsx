'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { saveSession } from '@/lib/auth';
import { Lock, Mail, ArrowRight, AlertCircle, ShieldCheck, Zap } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('from') || '/leads';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage('Por favor, informe seu e-mail corporativo e senha.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/auth/login', {
        email: email.trim(),
        password,
      });

      const { accessToken, user } = response.data;
      saveSession(accessToken, user);

      // Redirecionamento instantâneo para o painel de leads
      router.push(redirectPath);
    } catch (err: any) {
      const backendMessage = err.response?.data?.message;
      if (backendMessage) {
        setErrorMessage(Array.isArray(backendMessage) ? backendMessage.join(', ') : backendMessage);
      } else if (err.code === 'ERR_NETWORK') {
        setErrorMessage('Não foi possível conectar à API. Verifique se o backend NestJS está ativo na porta 3001.');
      } else {
        setErrorMessage('Credenciais inválidas. Verifique seu e-mail e senha de acesso.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Preenchimento de conveniência para desenvolvimento
  const handleQuickFill = () => {
    setEmail('admin@movy.com.br');
    setPassword('Admin@123456');
    setErrorMessage(null);
  };

  return (
    <div className="relative w-full max-w-[440px]">
      {/* Header da Marca */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-surface-card px-3 py-1 shadow-sm mb-4">
          <span className="flex h-2 w-2 rounded-full bg-status-success animate-pulse" />
          <span className="text-[11px] font-semibold tracking-wider text-text-secondary uppercase">
            MOVY Lead Engine & SDR
          </span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          Acesso à Mesa Comercial
        </h1>
        <p className="mt-1.5 text-sm text-text-secondary">
          Gestão cirúrgica de funil e qualificação oficial de delivery
        </p>
      </div>

      {/* Card de Autenticação */}
      <div className="relative rounded-2xl border border-white/10 bg-surface-card p-8 shadow-2xl backdrop-blur-xl">
        {errorMessage && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-status-danger/30 bg-status-danger/10 p-3.5 text-sm text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-danger" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Campo E-mail */}
          <div className="space-y-1.5">
            <label 
              htmlFor="email" 
              className="block text-xs font-semibold uppercase tracking-wider text-text-secondary"
            >
              E-mail de Operação
            </label>
            <div className="relative flex items-center">
              <Mail className="pointer-events-none absolute left-3.5 h-4 w-4 text-text-muted" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@movy.com.br"
                className="w-full rounded-xl border border-white/10 bg-surface-inset py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted/60 transition-all duration-150 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/40"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          {/* Campo Senha */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label 
                htmlFor="password" 
                className="block text-xs font-semibold uppercase tracking-wider text-text-secondary"
              >
                Senha de Acesso
              </label>
            </div>
            <div className="relative flex items-center">
              <Lock className="pointer-events-none absolute left-3.5 h-4 w-4 text-text-muted" />
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-white/10 bg-surface-inset py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted/60 transition-all duration-150 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/40"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          {/* Botão de Submissão com Feedback Tátil */}
          <button
            type="submit"
            disabled={isLoading}
            className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition-all duration-150 hover:bg-brand-hover active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Autenticando sessão...</span>
              </>
            ) : (
              <>
                <span>Entrar no Sistema</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </form>

        {/* Atalho de Credenciais de Seed (Desenvolvimento & Teste) */}
        <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-between text-xs text-text-muted">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-text-muted" />
            Ambiente Seguro
          </span>
          <button
            type="button"
            onClick={handleQuickFill}
            className="inline-flex items-center gap-1 text-text-secondary hover:text-brand transition-colors"
          >
            <Zap className="h-3 w-3" />
            Preencher Admin Inicial
          </button>
        </div>
      </div>

      {/* Rodapé Informativo */}
      <p className="mt-6 text-center text-xs text-text-muted">
        Plataforma de Alta Performance MOVY &copy; 2026. Acesso restrito a assessores comerciais.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-surface-canvas px-4 py-12">
      {/* Grid de fundo sutil e gradiente radial de profundidade */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }}
      />
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[600px] rounded-full bg-brand/10 blur-[140px]" />

      <Suspense fallback={<div className="text-text-muted text-sm">Carregando painel de autenticação...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
