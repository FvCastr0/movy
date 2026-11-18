'use client';

import React, { useState, useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { LeadInflowItem, LeadPeriodDays } from '@/types';

interface LeadInflowChartProps {
  inflow: LeadInflowItem[];
  inflowTotal: number;
  inflowAverageDaily: number;
  peakDay: { date: string; count: number } | null;
  selectedDays: LeadPeriodDays;
  onDaysChange: (days: LeadPeriodDays) => void;
  isLoading?: boolean;
}

const PERIOD_OPTIONS: { label: string; value: LeadPeriodDays }[] = [
  { label: '14 Dias', value: 14 },
  { label: '30 Dias', value: 30 },
  { label: '3 Meses', value: 90 },
  { label: '6 Meses', value: 180 },
];

export function LeadInflowChart({
  inflow,
  inflowTotal,
  inflowAverageDaily,
  peakDay,
  selectedDays,
  onDaysChange,
  isLoading = false,
}: LeadInflowChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Dimensões do viewBox SVG
  const svgWidth = 600;
  const svgHeight = 175;
  const paddingX = 25;
  const paddingTop = 20;
  const paddingBottom = 30;
  const chartWidth = svgWidth - paddingX * 2;
  const chartHeight = svgHeight - paddingTop - paddingBottom;
  const baseY = paddingTop + chartHeight;

  const maxCount = useMemo(() => {
    if (!inflow || inflow.length === 0) return 5;
    const maxVal = Math.max(...inflow.map((i) => i.count), 0);
    return Math.max(maxVal, 4);
  }, [inflow]);

  // Mapeamento dos pontos X e Y no plano SVG
  const points = useMemo(() => {
    if (!inflow || inflow.length === 0) return [];
    const count = inflow.length;

    return inflow.map((item, index) => {
      const x = count === 1 ? paddingX + chartWidth / 2 : paddingX + (index / (count - 1)) * chartWidth;
      const countRatio = maxCount > 0 ? item.count / maxCount : 0;
      const y = baseY - countRatio * chartHeight;
      return { x, y, item, index };
    });
  }, [inflow, maxCount, chartWidth, chartHeight, baseY, paddingX]);

  // Geração do caminho suave (Curva Bézier Cúbica)
  const { linePath, areaPath } = useMemo(() => {
    if (points.length === 0) return { linePath: '', areaPath: '' };
    if (points.length === 1) {
      const p = points[0];
      return {
        linePath: `M ${p.x - 20} ${p.y} L ${p.x + 20} ${p.y}`,
        areaPath: `M ${p.x - 20} ${baseY} L ${p.x - 20} ${p.y} L ${p.x + 20} ${p.y} L ${p.x + 20} ${baseY} Z`,
      };
    }

    let d = `M ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midX = prev.x + (curr.x - prev.x) / 2;
      // Curva cúbica suave ancorada em X
      d += ` C ${midX} ${prev.y}, ${midX} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    const area = `${d} L ${lastPoint.x} ${baseY} L ${firstPoint.x} ${baseY} Z`;

    return { linePath: d, areaPath: area };
  }, [points, baseY]);

  // Linha horizontal da média diária
  const averageY = useMemo(() => {
    if (maxCount <= 0) return baseY;
    const ratio = Math.min(inflowAverageDaily / maxCount, 1);
    return baseY - ratio * chartHeight;
  }, [inflowAverageDaily, maxCount, baseY, chartHeight]);

  // Função para determinar quais rótulos do eixo X exibir sem sobreposição
  const shouldShowLabel = (index: number, total: number) => {
    if (total <= 14) return true;
    if (total <= 30) return index % 4 === 0 || index === total - 1;
    if (total <= 90) return index % 14 === 0 || index === total - 1;
    // 180 dias (~6 meses): a cada ~30 dias
    return index % 30 === 0 || index === total - 1;
  };

  const hoveredPoint = hoveredIdx !== null && points[hoveredIdx] ? points[hoveredIdx] : null;

  return (
    <div className="rounded-2xl border border-white/10 bg-surface-card p-6 flex flex-col justify-between">
      <div>
        {/* Cabeçalho do Card */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-white/10">
          <div>
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand" />
              Ritmo de Entrada de Leads (CRM)
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Curva de novos leads captados por dia no pipeline comercial
            </p>
          </div>

          {/* Seletor de Janela Temporal: 14D, 30D, 3M, 6M */}
          <div className="flex items-center rounded-lg border border-white/10 bg-white/5 p-0.5 self-start sm:self-auto overflow-x-auto max-w-full">
            {PERIOD_OPTIONS.map((period) => (
              <button
                key={period.value}
                type="button"
                onClick={() => onDaysChange(period.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all whitespace-nowrap ${
                  selectedDays === period.value
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>

        {/* Resumo Rápido das Métricas do Período */}
        <div className="grid grid-cols-3 gap-3 pt-4 pb-2">
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
            <span className="text-[10px] text-text-muted uppercase font-semibold block">Total Recebido</span>
            <span className="text-lg font-black text-text-primary">{inflowTotal} leads</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
            <span className="text-[10px] text-text-muted uppercase font-semibold block">Média Diária</span>
            <span className="text-lg font-black text-brand">{inflowAverageDaily}/dia</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
            <span className="text-[10px] text-text-muted uppercase font-semibold block">Dia de Pico</span>
            <span className="text-lg font-black text-emerald-400">
              {peakDay ? `${peakDay.count} (${peakDay.date})` : '—'}
            </span>
          </div>
        </div>

        {/* Canvas Gráfico em Linha SVG Nativo */}
        <div className="relative pt-4">
          {isLoading && (
            <div className="absolute inset-0 bg-surface-card/60 backdrop-blur-xs flex items-center justify-center z-20 rounded-xl">
              <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Tooltip Dinâmico Flutuante */}
          {hoveredPoint && (
            <div
              className="absolute z-30 pointer-events-none transform -translate-x-1/2 -top-3 px-2.5 py-1.5 rounded-lg bg-surface-canvas/95 border border-brand/60 shadow-xl backdrop-blur-md text-center"
              style={{
                left: `${(hoveredPoint.x / svgWidth) * 100}%`,
              }}
            >
              <div className="text-[11px] font-bold text-text-primary whitespace-nowrap">
                {hoveredPoint.item.count} {hoveredPoint.item.count === 1 ? 'lead' : 'leads'}
              </div>
              <div className="text-[9px] text-text-muted whitespace-nowrap flex items-center justify-center gap-1">
                <span>{hoveredPoint.item.label}</span>
                <span>•</span>
                <span>{hoveredPoint.item.dayOfWeek}</span>
              </div>
            </div>
          )}

          <div className="w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-[175px] overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                {/* Gradiente da Área sob a Linha */}
                <linearGradient id="lead-inflow-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.0" />
                </linearGradient>

                {/* Gradiente da Linha de Pico */}
                <linearGradient id="lead-peak-gradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#7c3aed" />
                  <stop offset="100%" stopColor="#eab308" />
                </linearGradient>
              </defs>

              {/* Linhas de Grade de Fundo (Base e Topo) */}
              <line
                x1={paddingX}
                y1={baseY}
                x2={svgWidth - paddingX}
                y2={baseY}
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="1"
              />
              <line
                x1={paddingX}
                y1={paddingTop}
                x2={svgWidth - paddingX}
                y2={paddingTop}
                stroke="rgba(255, 255, 255, 0.04)"
                strokeDasharray="3 3"
                strokeWidth="1"
              />

              {/* Linha Tracejada da Média Diária de Referência */}
              {inflowAverageDaily > 0 && (
                <g>
                  <line
                    x1={paddingX}
                    y1={averageY}
                    x2={svgWidth - paddingX}
                    y2={averageY}
                    stroke="rgba(255, 255, 255, 0.22)"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x={svgWidth - paddingX}
                    y={Math.max(averageY - 4, paddingTop + 8)}
                    textAnchor="end"
                    fill="rgba(255, 255, 255, 0.4)"
                    fontSize="8.5"
                    fontWeight="600"
                  >
                    Média: {inflowAverageDaily}/dia
                  </text>
                </g>
              )}

              {/* Área Sombreada sob a Curva */}
              {areaPath && (
                <path d={areaPath} fill="url(#lead-inflow-gradient)" className="transition-all duration-300" />
              )}

              {/* Traçado da Curva Principal em Linha Suave */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-300 drop-shadow-[0_2px_8px_rgba(139,92,246,0.35)]"
                />
              )}

              {/* Linha Guia Vertical do Hover Ativo */}
              {hoveredPoint && (
                <line
                  x1={hoveredPoint.x}
                  y1={paddingTop}
                  x2={hoveredPoint.x}
                  y2={baseY}
                  stroke="rgba(255, 255, 255, 0.35)"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
              )}

              {/* Nós de Dados nos Pontos */}
              {points.map((p) => {
                const isHovered = hoveredIdx === p.index;
                const isPeak = peakDay && p.item.label === peakDay.date && p.item.count > 0;
                // Em janelas de 90 ou 180 dias, oculta nós normais para não saturar o gráfico
                const showRegularNode = selectedDays <= 30;

                if (!showRegularNode && !isHovered && !isPeak) return null;

                if (isPeak) {
                  return (
                    <g key={p.item.date}>
                      <circle cx={p.x} cy={p.y} r="6" fill="#eab308" fillOpacity="0.25" className="animate-pulse" />
                      <circle cx={p.x} cy={p.y} r="3.5" fill="#eab308" stroke="#ffffff" strokeWidth="1.5" />
                    </g>
                  );
                }

                if (isHovered) {
                  return (
                    <circle
                      key={p.item.date}
                      cx={p.x}
                      cy={p.y}
                      r="4.5"
                      fill="#ffffff"
                      stroke="#8b5cf6"
                      strokeWidth="2.5"
                    />
                  );
                }

                if (showRegularNode) {
                  return (
                    <circle
                      key={p.item.date}
                      cx={p.x}
                      cy={p.y}
                      r={p.item.count > 0 ? '2.5' : '1.5'}
                      fill={p.item.count > 0 ? '#8b5cf6' : 'rgba(255,255,255,0.15)'}
                      stroke="#0e0e11"
                      strokeWidth="1"
                    />
                  );
                }

                return null;
              })}

              {/* Rótulos do Eixo X na Base */}
              {points.map((p) => {
                if (!shouldShowLabel(p.index, points.length)) return null;

                let labelText = p.item.label;
                if (selectedDays === 14) {
                  labelText = p.item.dayOfWeek;
                }

                return (
                  <text
                    key={`label-${p.item.date}`}
                    x={p.x}
                    y={svgHeight - 8}
                    textAnchor="middle"
                    fill={hoveredIdx === p.index ? '#ffffff' : 'rgba(255, 255, 255, 0.4)'}
                    fontSize="9"
                    fontWeight={hoveredIdx === p.index ? '700' : '500'}
                    className="select-none transition-colors"
                  >
                    {labelText}
                  </text>
                );
              })}

              {/* Hitboxes Invisíveis para Interação Suave no Hover/Tap */}
              {points.map((p, idx) => {
                const sliceWidth = chartWidth / points.length;
                const rectX = p.x - sliceWidth / 2;

                return (
                  <rect
                    key={`hitbox-${p.item.date}`}
                    x={Math.max(rectX, 0)}
                    y={paddingTop}
                    width={Math.max(sliceWidth, 4)}
                    height={chartHeight + paddingBottom}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* Rodapé Informativo */}
      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-text-muted">
        <span>Origem: Inbound & Outbound</span>
        <span className="text-text-primary font-medium">Auto-registrado via CRM</span>
      </div>
    </div>
  );
}
