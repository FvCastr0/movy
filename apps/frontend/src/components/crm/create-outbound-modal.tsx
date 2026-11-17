'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import { X, UserPlus, Store, Phone, MapPin, DollarSign, Instagram, AlertCircle } from 'lucide-react';

interface CreateOutboundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateOutboundModal({ isOpen, onClose, onSuccess }: CreateOutboundModalProps) {
  const [formData, setFormData] = useState({
    nome: '',
    whatsapp: '',
    deliveryNome: '',
    segmento: 'Hamburgueria',
    cidade: '',
    instagramCardapio: '',
    dealValue: '',
    problemaPrincipal: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validações locais dos 5 campos obrigatórios
    if (!formData.nome.trim()) return setError('Nome do contato é obrigatório.');
    if (!formData.whatsapp.trim()) return setError('WhatsApp do contato é obrigatório.');
    if (!formData.deliveryNome.trim()) return setError('Nome do restaurante/delivery é obrigatório.');
    if (!formData.segmento.trim()) return setError('Segmento é obrigatório.');
    if (!formData.cidade.trim()) return setError('Cidade e Estado são obrigatórios.');

    setIsSubmitting(true);

    try {
      await api.post('/leads/outbound', {
        nome: formData.nome.trim(),
        whatsapp: formData.whatsapp.trim(),
        deliveryNome: formData.deliveryNome.trim(),
        segmento: formData.segmento.trim(),
        cidade: formData.cidade.trim(),
        instagramCardapio: formData.instagramCardapio.trim() || undefined,
        dealValue: formData.dealValue ? parseFloat(formData.dealValue) : undefined,
        problemaPrincipal: formData.problemaPrincipal.trim() || undefined,
      });

      onSuccess();
      onClose();
      setFormData({
        nome: '',
        whatsapp: '',
        deliveryNome: '',
        segmento: 'Hamburgueria',
        cidade: '',
        instagramCardapio: '',
        dealValue: '',
        problemaPrincipal: '',
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Falha ao cadastrar o lead outbound no servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-surface-card p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">Cadastrar Lead Outbound</h3>
              <p className="text-xs text-text-muted">Prospecção ativa interna da Movy</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-muted hover:bg-white/5 hover:text-text-primary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Nome do Contato <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Roberto Silva"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                WhatsApp c/ DDD <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-muted" />
                <input
                  type="text"
                  required
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="(11) 98765-4321"
                  className="w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Nome do Delivery <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Store className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-muted" />
                <input
                  type="text"
                  required
                  value={formData.deliveryNome}
                  onChange={(e) => setFormData({ ...formData, deliveryNome: e.target.value })}
                  placeholder="Ex: Burger King Kong"
                  className="w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Segmento <span className="text-rose-400">*</span>
              </label>
              <select
                value={formData.segmento}
                onChange={(e) => setFormData({ ...formData, segmento: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-surface-canvas px-3 py-2 text-xs text-text-primary focus:border-brand focus:outline-none"
              >
                <option value="Hamburgueria">Hamburgueria</option>
                <option value="Pizzaria">Pizzaria</option>
                <option value="Esfiharia">Esfiharia</option>
                <option value="Sushi / Japonês">Sushi / Japonês</option>
                <option value="Açaí / Sorvetes">Açaí / Sorvetes</option>
                <option value="Marmitex / PF">Marmitex / PF</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Cidade - UF <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-muted" />
                <input
                  type="text"
                  required
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                  placeholder="Ex: Campinas - SP"
                  className="w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Instagram / Cardápio (Opcional)
              </label>
              <div className="relative">
                <Instagram className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-muted" />
                <input
                  type="text"
                  value={formData.instagramCardapio}
                  onChange={(e) => setFormData({ ...formData, instagramCardapio: e.target.value })}
                  placeholder="@deliveryburgers"
                  className="w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Valor Previsto (R$ fee mensal)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-muted" />
                <input
                  type="number"
                  step="100"
                  min="0"
                  value={formData.dealValue}
                  onChange={(e) => setFormData({ ...formData, dealValue: e.target.value })}
                  placeholder="2500"
                  className="w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Contexto / Dor Principal
              </label>
              <input
                type="text"
                value={formData.problemaPrincipal}
                onChange={(e) => setFormData({ ...formData, problemaPrincipal: e.target.value })}
                placeholder="Ex: Depende 90% do iFood"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-text-muted hover:bg-white/5 hover:text-text-primary transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white shadow-md shadow-brand/20 hover:bg-brand-hover transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : 'Cadastrar Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
