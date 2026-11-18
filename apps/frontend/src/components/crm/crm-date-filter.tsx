'use client';

import React, { useState } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';
import { CrmDatePreset, CrmDateRange } from '@/types';

interface CrmDateFilterProps {
  currentRange: CrmDateRange;
  onChange: (range: CrmDateRange) => void;
  disabled?: boolean;
}

export function CrmDateFilter({ currentRange, onChange, disabled }: CrmDateFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const formatDateYMD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSelectPreset = (preset: CrmDatePreset) => {
    const now = new Date();

    if (preset === 'ALL') {
      onChange({
        preset: 'ALL',
        startDate: undefined,
        endDate: undefined,
        label: 'Todo o Período (Geral)',
      });
      setIsOpen(false);
      return;
    }

    if (preset === 'TODAY') {
      const todayStr = formatDateYMD(now);
      onChange({
        preset: 'TODAY',
        startDate: todayStr,
        endDate: todayStr,
        label: 'Hoje',
      });
      setIsOpen(false);
      return;
    }

    if (preset === '7D') {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      onChange({
        preset: '7D',
        startDate: formatDateYMD(past),
        endDate: formatDateYMD(now),
        label: 'Últimos 7 dias',
      });
      setIsOpen(false);
      return;
    }

    if (preset === 'THIS_MONTH') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      onChange({
        preset: 'THIS_MONTH',
        startDate: formatDateYMD(startOfMonth),
        endDate: formatDateYMD(now),
        label: 'Este Mês',
      });
      setIsOpen(false);
      return;
    }

    if (preset === 'LAST_MONTH') {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      onChange({
        preset: 'LAST_MONTH',
        startDate: formatDateYMD(startOfLastMonth),
        endDate: formatDateYMD(endOfLastMonth),
        label: 'Mês Anterior',
      });
      setIsOpen(false);
      return;
    }

    if (preset === 'CUSTOM') {
      // Abre inputs customizados
      setIsOpen(true);
    }
  };

  const applyCustomRange = () => {
    if (!customStart) return;
    onChange({
      preset: 'CUSTOM',
      startDate: customStart,
      endDate: customEnd || customStart,
      label: `${customStart.split('-').reverse().slice(0, 2).join('/')} a ${(customEnd || customStart).split('-').reverse().slice(0, 2).join('/')}`,
    });
    setIsOpen(false);
  };

  const presets: { id: CrmDatePreset; label: string }[] = [
    { id: 'ALL', label: 'Todo o Período (Geral)' },
    { id: 'TODAY', label: 'Hoje' },
    { id: '7D', label: 'Últimos 7 dias' },
    { id: 'THIS_MONTH', label: 'Este Mês' },
    { id: 'LAST_MONTH', label: 'Mês Anterior' },
    { id: 'CUSTOM', label: 'Personalizado...' },
  ];

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-lg border border-white/10 bg-surface-card px-3 py-2 text-xs font-medium text-text-primary hover:border-white/20 hover:bg-white/[0.04] transition-colors disabled:opacity-50"
      >
        <Calendar className="w-3.5 h-3.5 text-brand" />
        <span>{currentRange.label}</span>
        <ChevronDown className="w-3.5 h-3.5 text-text-muted transition-transform duration-200" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-1.5 w-64 rounded-xl border border-white/10 bg-surface-card p-2 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="space-y-1">
              {presets.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectPreset(item.id)}
                  className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors ${
                    currentRange.preset === item.id
                      ? 'bg-brand/10 text-brand font-semibold'
                      : 'text-text-muted hover:bg-white/5 hover:text-text-primary'
                  }`}
                >
                  <span>{item.label}</span>
                  {currentRange.preset === item.id && <Check className="w-3.5 h-3.5 text-brand" />}
                </button>
              ))}
            </div>

            {currentRange.preset === 'CUSTOM' || currentRange.preset === ('CUSTOM' as any) ? (
              <div className="mt-2.5 pt-2.5 border-t border-white/10 space-y-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  Intervalo Customizado
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="text-[10px] text-text-muted block mb-0.5">Início</label>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-text-primary focus:border-brand focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-text-muted block mb-0.5">Fim</label>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-text-primary focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!customStart}
                  onClick={applyCustomRange}
                  className="w-full rounded-md bg-brand py-1.5 text-[11px] font-semibold text-black hover:bg-brand-hover transition-colors disabled:opacity-50"
                >
                  Aplicar Período
                </button>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
