'use client';

import React, { useState, useRef } from 'react';
import { api } from '@/lib/api';
import { RevenueReportResponse } from '@/types';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  X, 
  DollarSign, 
  ShoppingBag, 
  Calendar,
  Sparkles,
  TrendingUp
} from 'lucide-react';

interface CsvRevenueUploadModalProps {
  clientId: string;
  clientName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (reportResponse: RevenueReportResponse) => void;
}

export function CsvRevenueUploadModal({
  clientId,
  clientName,
  isOpen,
  onClose,
  onSuccess,
}: CsvRevenueUploadModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [csvContent, setCsvContent] = useState('');
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RevenueReportResponse | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text || '');
    };
    reader.onerror = () => {
      setError('Falha ao ler arquivo CSV.');
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvContent.trim()) {
      setError('Por favor, selecione um arquivo CSV ou cole o conteúdo das vendas.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const res = await api.post<RevenueReportResponse>(`/onboarding/${clientId}/revenue-csv`, {
        csvData: csvContent,
        filename: selectedFileName || 'importacao_manual.csv',
      });

      setResult(res.data);
      onSuccess(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao processar e calcular faturamento do CSV.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setCsvContent('');
    setSelectedFileName(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-base flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-brand-500" />
              Importar Faturamento & Vendas de {clientName}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Suporta relatórios CSV de PDV, iFood, Saipos, Anota AI e similares.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Exibição de Resultado de Sucesso */}
        {result ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Relatório de Vendas Processado com Sucesso!
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                Os dados foram auditados e salvos no histórico operacional do cliente.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 dark:bg-gray-750 rounded-xl border border-gray-100 dark:border-gray-700">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Faturamento Total</span>
                <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(result.grossRevenue)}
                </div>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-750 rounded-xl border border-gray-100 dark:border-gray-700">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total de Pedidos</span>
                <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                  {result.ordersCount}
                </div>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-750 rounded-xl border border-gray-100 dark:border-gray-700 col-span-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Ticket Médio Estimado</span>
                <div className="text-lg font-bold text-brand-600 dark:text-brand-400 mt-1">
                  {formatCurrency(result.ticketMedioPedidos)}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Importar Outro Arquivo
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors"
              >
                Concluir
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Abas Upload vs Colar */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-all ${
                  activeTab === 'upload'
                    ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
              >
                Carregar Arquivo (.csv)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('paste')}
                className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-all ${
                  activeTab === 'paste'
                    ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
              >
                Colar Linhas CSV
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {activeTab === 'upload' ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-brand-500 dark:hover:border-brand-400 transition-colors bg-gray-50/50 dark:bg-gray-750/30"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <FileText className="w-10 h-10 text-brand-500 mx-auto mb-2 opacity-80" />
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {selectedFileName ? selectedFileName : 'Clique para selecionar o arquivo CSV'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Formatos aceitos com colunas de Data, Faturamento/Total e Pedidos.
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Cole o conteúdo do CSV abaixo:
                </label>
                <textarea
                  rows={6}
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  placeholder="data,faturamento,pedidos&#10;2026-11-01,1540.50,32&#10;2026-11-02,2100.00,45"
                  className="w-full p-3 font-mono text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isUploading}
                className="px-4 py-2 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 rounded-lg transition-colors inline-flex items-center gap-1.5"
              >
                {isUploading ? 'Processando...' : 'Processar & Calcular'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
