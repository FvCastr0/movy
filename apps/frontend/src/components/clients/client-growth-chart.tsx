'use client';

import React, { useState } from 'react';
import { WeeklyReport } from '@/types';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  DollarSign,
  MessageCircle,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

interface ClientGrowthChartProps {
  reports: WeeklyReport[];
  clientName?: string;
}

export function ClientGrowthChart({ reports, clientName }: ClientGrowthChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Ordena relatórios cronologicamente (mais antigo para o mais recente)
  const sortedReports = [...reports].sort(
    (a, b) => new Date(a.weekStartDate).getTime() - new Date(b.weekStartDate).getTime()
  );

  const formatCurrency = (val?: number | null) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(
      val || 0
    );
  };

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' }).replace('.', '');
  };

  const calculateReportDays = (start: string | Date, end: string | Date) => {
    const s = new Date(start);
    const e = new Date(end);
    const diff = e.getTime() - s.getTime();
    if (isNaN(diff) || diff <= 0) return 1;
    return Math.round(diff / (1000 * 60 * 60 * 24));
  };

  if (!reports || reports.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-surface-card p-6 text-center space-y-2">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <BarChart3 className="h-5 w-5" />
        </div>
        <h4 className="text-sm font-bold text-text-primary">Evolução & Performance por Período</h4>
        <p className="text-xs text-text-muted max-w-md mx-auto">
          Nenhum relatório de performance registrado ainda. Gere o primeiro relatório automático via Meta Ads para iniciar o acompanhamento gráfico de crescimento.
        </p>
      </div>
    );
  }

  // Se houver apenas 1 relatório
  if (sortedReports.length === 1) {
    const r = sortedReports[0];
    const singleReportDays = calculateReportDays(r.weekStartDate, r.weekEndDate);
    return (
      <div className="rounded-xl border border-white/10 bg-surface-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-brand" />
            <h4 className="text-sm font-bold text-text-primary">Evolução & Performance por Período</h4>
          </div>
          <span className="text-[11px] text-text-muted">1 relatório ({singleReportDays} dias)</span>
        </div>
        <p className="text-xs text-text-muted">
          A curva de crescimento comparativa será exibida assim que o 2º relatório for emitido. Desempenho do período registrado:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3 bg-surface-canvas rounded-lg border border-white/5">
            <span className="text-[10px] text-text-muted block">Investimento</span>
            <span className="text-sm font-bold text-brand">{formatCurrency(r.metaSpend)}</span>
          </div>
          <div className="p-3 bg-surface-canvas rounded-lg border border-white/5">
            <span className="text-[10px] text-text-muted block">Conversas / Chats</span>
            <span className="text-sm font-bold text-status-success">{r.metaConversas}</span>
          </div>
          <div className="p-3 bg-surface-canvas rounded-lg border border-white/5">
            <span className="text-[10px] text-text-muted block">Custo por Conversa</span>
            <span className="text-sm font-bold text-text-primary">{formatCurrency(r.metaCostPerChat)}</span>
          </div>
          <div className="p-3 bg-surface-canvas rounded-lg border border-white/5">
            <span className="text-[10px] text-text-muted block">Faturamento</span>
            <span className="text-sm font-bold text-text-primary">{formatCurrency(r.faturamentoTotal)}</span>
          </div>
        </div>
      </div>
    );
  }

  // Cálculos para o gráfico SVG
  const maxSpend = Math.max(...sortedReports.map((r) => r.metaSpend), 100);
  const maxConversas = Math.max(...sortedReports.map((r) => r.metaConversas), 10);

  // Dimensões do viewBox SVG
  const svgWidth = 600;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingY = 30;
  const chartWidth = svgWidth - paddingX * 2;
  const chartHeight = svgHeight - paddingY * 2;

  // Pontos para barras de investimento e linha de conversas
  const stepX = chartWidth / (sortedReports.length - 1 || 1);

  const points = sortedReports.map((r, i) => {
    const x = paddingX + i * stepX;
    // Altura da barra proporcional ao maxSpend
    const barHeight = (r.metaSpend / maxSpend) * chartHeight;
    const barY = paddingY + chartHeight - barHeight;

    // Posição Y da linha de conversas proporcional ao maxConversas
    const lineY = paddingY + chartHeight - (r.metaConversas / maxConversas) * chartHeight;

    return { x, barY, barHeight, lineY, report: r };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.lineY}`).join(' ');

  // Comparação Semana Atual vs Anterior
  const latest = sortedReports[sortedReports.length - 1];
  const previous = sortedReports[sortedReports.length - 2];

  const diffConversas = latest.metaConversas - previous.metaConversas;
  const pctConversas =
    previous.metaConversas > 0
      ? Number(((diffConversas / previous.metaConversas) * 100).toFixed(1))
      : 0;

  const diffCpa = latest.metaCostPerChat - previous.metaCostPerChat;
  const pctCpa =
    previous.metaCostPerChat > 0
      ? Number(((diffCpa / previous.metaCostPerChat) * 100).toFixed(1))
      : 0;

  return (
    <div className="rounded-xl border border-white/10 bg-surface-card p-6 space-y-5">
      {/* Header do Gráfico */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-white/10">
        <div>
          <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-brand" />
            Trajetória & Crescimento de Performance do Delivery
          </h4>
          <p className="text-xs text-text-muted mt-0.5">
            Evolução de Investimento Meta Ads (Barras) vs Conversas Geradas (Linha)
          </p>
        </div>

        {/* Badges de Comparação Semana a Semana */}
        <div className="flex items-center gap-2 text-xs">
          <div
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-semibold border ${
              pctConversas >= 0
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}
          >
            {pctConversas >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            <span>Conversas: {pctConversas >= 0 ? `+${pctConversas}%` : `${pctConversas}%`}</span>
          </div>

          <div
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-semibold border ${
              pctCpa <= 0
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}
          >
            {pctCpa <= 0 ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
            <span>CPA: {pctCpa <= 0 ? `${pctCpa}%` : `+${pctCpa}%`}</span>
          </div>
        </div>
      </div>

      {/* Área do Gráfico SVG */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-48 sm:h-56 select-none"
        >
          <defs>
            {/* Gradiente das Barras de Investimento */}
            <linearGradient id="brandBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF5400" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#FF5400" stopOpacity="0.25" />
            </linearGradient>

            {/* Gradiente de Linha */}
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#34D399" />
            </linearGradient>
          </defs>

          {/* Linhas de Grade Horizontais */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = paddingY + chartHeight * pct;
            return (
              <line
                key={idx}
                x1={paddingX}
                y1={y}
                x2={svgWidth - paddingX}
                y2={y}
                stroke="#ffffff"
                strokeOpacity="0.05"
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Barras de Investimento */}
          {points.map((p, idx) => {
            const barW = Math.min(36, stepX * 0.4);
            const isHover = hoveredIdx === idx;

            return (
              <g
                key={idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer transition-opacity"
              >
                <rect
                  x={p.x - barW / 2}
                  y={p.barY}
                  width={barW}
                  height={p.barHeight}
                  rx="4"
                  fill="url(#brandBarGrad)"
                  opacity={isHover ? 1 : 0.75}
                  stroke={isHover ? '#FF5400' : 'none'}
                  strokeWidth="1.5"
                />

                {/* Rótulo de Data no Eixo X */}
                <text
                  x={p.x}
                  y={svgHeight - 8}
                  textAnchor="middle"
                  fill="#71717A"
                  fontSize="10"
                  fontWeight="600"
                >
                  {formatDateLabel(p.report.weekStartDate)}
                </text>
              </g>
            );
          })}

          {/* Linha de Conversas de Mensagens */}
          <path
            d={linePath}
            fill="none"
            stroke="url(#lineGrad)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Pontos Clicáveis na Linha */}
          {points.map((p, idx) => {
            const isHover = hoveredIdx === idx;
            return (
              <g
                key={idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer"
              >
                <circle
                  cx={p.x}
                  cy={p.lineY}
                  r={isHover ? 6 : 4}
                  fill="#10B981"
                  stroke="#18181B"
                  strokeWidth="2"
                  className="transition-all"
                />
              </g>
            );
          })}
        </svg>

        {/* Tooltip Dinâmico ao passar o mouse */}
        {hoveredIdx !== null && points[hoveredIdx] && (
          <div className="mt-2 p-3 rounded-lg border border-white/10 bg-surface-canvas text-xs flex items-center justify-between animate-fade-in">
            <div>
              <span className="font-bold text-text-primary block">
                Período: {formatDateLabel(points[hoveredIdx].report.weekStartDate)} a{' '}
                {formatDateLabel(points[hoveredIdx].report.weekEndDate)} ({calculateReportDays(points[hoveredIdx].report.weekStartDate, points[hoveredIdx].report.weekEndDate)} dias)
              </span>
              <span className="text-text-muted text-[11px]">
                {points[hoveredIdx].report.analiseGestor || 'Relatório de performance consolidado'}
              </span>
            </div>

            <div className="flex items-center gap-4 text-right">
              <div>
                <span className="text-[10px] text-text-muted block">Gasto Meta</span>
                <span className="font-bold text-brand">{formatCurrency(points[hoveredIdx].report.metaSpend)}</span>
              </div>
              <div>
                <span className="text-[10px] text-text-muted block">Conversas</span>
                <span className="font-bold text-emerald-400">{points[hoveredIdx].report.metaConversas} chats</span>
              </div>
              <div>
                <span className="text-[10px] text-text-muted block">CPA Médio</span>
                <span className="font-bold text-text-primary">
                  {formatCurrency(points[hoveredIdx].report.metaCostPerChat)}
                </span>
              </div>
              {points[hoveredIdx].report.metaRoas ? (
                <div>
                  <span className="text-[10px] text-text-muted block">ROAS</span>
                  <span className="font-bold text-yellow-400">{points[hoveredIdx].report.metaRoas}x</span>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Legenda do Gráfico */}
      <div className="flex items-center justify-center gap-6 pt-2 border-t border-white/5 text-xs text-text-muted">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-brand" />
          <span>Investimento em Tráfego (R$)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-5 rounded-full bg-emerald-500" />
          <span>Conversas / Resultados Gerados</span>
        </div>
      </div>
    </div>
  );
}
