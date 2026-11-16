import React from 'react';
import { LeadQualification } from '@/types';

interface MicroRadarProps {
  qualification?: LeadQualification | null;
  compact?: boolean;
}

export function MicroRadar({ qualification, compact = false }: MicroRadarProps) {
  if (!qualification) {
    return (
      <span className="text-[11px] text-text-muted italic">
        Não avaliado
      </span>
    );
  }

  // Regras oficiais do Manual SDR MOVY:
  // Perfil >= 2, Operacao >= 2, Necessidade >= 2, Investimento >= 2, Decisor = 3, Momento >= 2
  const criteria = [
    { label: 'P', name: 'Perfil', val: qualification.scorePerfil, min: 2 },
    { label: 'O', name: 'Operação', val: qualification.scoreCapacidadeOperacional, min: 2 },
    { label: 'N', name: 'Necessidade', val: qualification.scoreNecessidadeObjetivo, min: 2 },
    { label: 'I', name: 'Investimento', val: qualification.scoreCapacidadeInvestir, min: 2 },
    { label: 'D', name: 'Decisor', val: qualification.scoreAcessoDecisor, min: 3 },
    { label: 'M', name: 'Momento', val: qualification.scoreMomentoContratacao, min: 2 },
  ];

  const allFilled = criteria.every((c) => c.val !== null && c.val !== undefined);
  const isApto = allFilled && criteria.every((c) => (c.val ?? 0) >= c.min);
  const total = qualification.totalScore ?? 0;

  return (
    <div className="flex items-center gap-2">
      {/* 6 Pinos do Micro-Radar */}
      <div className="flex items-center gap-1" title="Critérios SDR: Perfil (≥2), Operação (≥2), Necessidade (≥2), Investimento (≥2), Decisor (=3), Momento (≥2)">
        {criteria.map((c) => {
          const filled = c.val !== null && c.val !== undefined;
          const passed = filled && (c.val ?? 0) >= c.min;

          let bgClass = 'bg-white/10 text-text-muted'; // Pendente
          if (filled) {
            bgClass = passed
              ? 'bg-status-success/20 text-status-success border border-status-success/40'
              : 'bg-status-danger/20 text-status-danger border border-status-danger/40';
          }

          return (
            <span
              key={c.label}
              className={`flex h-4 w-4 items-center justify-center rounded-[3px] text-[9px] font-bold ${bgClass}`}
              title={`${c.name}: ${filled ? c.val : 'Pendente'} (Mínimo: ${c.min})`}
            >
              {c.label}
            </span>
          );
        })}
      </div>

      {!compact && allFilled && (
        <span
          className={`text-[11px] font-semibold tracking-tight ${
            isApto ? 'text-status-success' : 'text-text-muted'
          }`}
        >
          {isApto ? 'Apto Closer' : `${total}/18 pts`}
        </span>
      )}
    </div>
  );
}
