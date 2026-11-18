'use client';

import React, { useEffect, useState } from 'react';
import { RotateCcw, X, CheckCircle2 } from 'lucide-react';

export interface UndoToastData {
  leadId: string;
  leadName: string;
  fromStageLabel: string;
  toStageLabel: string;
}

interface StageUndoToastProps {
  data: UndoToastData | null;
  onUndo: (leadId: string) => Promise<void>;
  onClose: () => void;
  durationMs?: number;
}

export function StageUndoToast({
  data,
  onUndo,
  onClose,
  durationMs = 8000,
}: StageUndoToastProps) {
  const [isUndoing, setIsUndoing] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!data) return;

    setProgress(100);
    setIsUndoing(false);

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / durationMs) * 100);
      setProgress(remaining);

      if (elapsed >= durationMs) {
        clearInterval(interval);
        onClose();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [data, durationMs, onClose]);

  if (!data) return null;

  const handleUndoClick = async () => {
    try {
      setIsUndoing(true);
      await onUndo(data.leadId);
      onClose();
    } catch {
      setIsUndoing(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="overflow-hidden rounded-xl border border-white/15 bg-zinc-900/95 p-4 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/20 text-brand">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-text-primary">
                Estágio atualizado
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">
                <strong className="text-text-primary">{data.leadName}</strong> movido para <span className="text-brand font-medium">{data.toStageLabel}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors p-1"
            title="Fechar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/10">
          <span className="text-[10px] text-text-muted">
            Moveu por engano?
          </span>
          <button
            type="button"
            onClick={handleUndoClick}
            disabled={isUndoing}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-semibold text-text-primary transition-colors disabled:opacity-50"
          >
            <RotateCcw className={`h-3 w-3 ${isUndoing ? 'animate-spin' : ''}`} />
            <span>{isUndoing ? 'Desfazendo...' : 'Desfazer'}</span>
          </button>
        </div>

        {/* Barra de progresso animada */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
          <div
            className="h-full bg-brand transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
