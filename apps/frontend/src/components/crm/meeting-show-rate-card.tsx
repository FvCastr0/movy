'use client';

import React, { useState, useEffect } from 'react';
import { Lead } from '@/types';
import { sendMeetingConfirmation } from '@/lib/api';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Copy,
  ExternalLink,
  Send,
  Sparkles,
  Check,
  AlertCircle,
  Link as LinkIcon,
  UserCheck,
} from 'lucide-react';

interface MeetingShowRateCardProps {
  lead: Lead;
  closerName?: string;
  onLeadUpdated?: (updatedLead: Lead) => void;
}

type Milestone = '24H' | '12H' | '1H';

export function MeetingShowRateCard({
  lead,
  closerName,
  onLeadUpdated,
}: MeetingShowRateCardProps) {
  const [activeMilestone, setActiveMilestone] = useState<Milestone>('24H');
  const [customMessage, setCustomMessage] = useState('');
  const [meetLink, setMeetLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSendingBot, setIsSendingBot] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const meetingDateObj = lead.meetingDate ? new Date(lead.meetingDate) : null;

  // Formata data e hora legíveis
  const formattedDateTime = meetingDateObj
    ? new Intl.DateTimeFormat('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
      }).format(meetingDateObj)
    : 'Data não definida';

  // Gerador de scripts dinâmicos
  const getTemplateMessage = (milestone: Milestone, appendLink = ''): string => {
    if (!meetingDateObj) return '';

    const leadFirstName = lead.nome ? lead.nome.split(' ')[0] : 'Parceiro';
    const delivery = lead.deliveryNome || 'seu delivery';
    const cName = closerName || lead.closerResponsible?.name?.split(' ')[0] || 'da equipe MOVY';

    const timeFormatted = new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    }).format(meetingDateObj);

    const dateFormatted = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      timeZone: 'America/Sao_Paulo',
    }).format(meetingDateObj);

    const weekday = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      timeZone: 'America/Sao_Paulo',
    }).format(meetingDateObj);

    if (milestone === '24H') {
      return [
        `Olá, *${leadFirstName}*! Tudo bem?`,
        '',
        `Aqui é o *${cName}* da assessoria *MOVY*. Passando para confirmar nossa apresentação estratégica para o *${delivery}*, agendada para amanhã (${weekday}, ${dateFormatted} às ${timeFormatted}).`,
        '',
        `Conseguimos manter esse horário ou prefere algum ajuste?`,
      ].join('\n');
    }

    if (milestone === '12H') {
      return [
        `Bom dia, *${leadFirstName}*!`,
        '',
        `Passando para alinhar nossa reunião hoje às *${timeFormatted}*. Já estou com a estrutura do *${delivery}* pronta para desenharmos nosso plano de escala juntos.`,
        '',
        `Nos falamos mais tarde!`,
      ].join('\n');
    }

    // Milestone 1H
    const linkText = appendLink ? `\n\n👉 *Link da sala:* ${appendLink}` : '\n\nEm instantes te envio o link de acesso por aqui.';
    return [
      `Oi, *${leadFirstName}*!`,
      '',
      `Nossa reunião de apresentação começa em *1 hora* (às *${timeFormatted}*)!${linkText}`,
      '',
      `Nos vemos já já!`,
    ].join('\n');
  };

  // Atualiza o texto dinamicamente ao trocar de aba
  useEffect(() => {
    setCustomMessage(getTemplateMessage(activeMilestone, meetLink));
    setActionFeedback(null);
  }, [activeMilestone, lead.id, lead.meetingDate]);

  // Se o usuário digitar um link do meet no marco de 1h, atualiza o texto
  const handleMeetLinkChange = (link: string) => {
    setMeetLink(link);
    setCustomMessage(getTemplateMessage('1H', link.trim()));
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(customMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleOpenWhatsAppWeb = async () => {
    const cleanNumber = lead.whatsapp.replace(/\D/g, '');
    const recipient = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;
    const url = `https://wa.me/${recipient}?text=${encodeURIComponent(customMessage)}`;
    window.open(url, '_blank');

    // Marca como enviado no banco
    try {
      const res = await sendMeetingConfirmation(lead.id, {
        milestone: activeMilestone,
        sendViaBot: false,
      });
      if (res?.updatedLead && onLeadUpdated) {
        onLeadUpdated(res.updatedLead);
      }
      setActionFeedback({
        type: 'success',
        message: 'Aberto no WhatsApp Web e registrado no histórico!',
      });
    } catch {
      // Ignora erro de tracking
    }
  };

  const handleSendViaBot = async () => {
    setIsSendingBot(true);
    setActionFeedback(null);

    try {
      const res = await sendMeetingConfirmation(lead.id, {
        milestone: activeMilestone,
        customMessage,
        sendViaBot: true,
      });

      if (res?.success) {
        setActionFeedback({
          type: 'success',
          message: 'Mensagem de confirmação enviada com sucesso no WhatsApp do lead via Bot MOVY!',
        });
        if (res.updatedLead && onLeadUpdated) {
          onLeadUpdated(res.updatedLead);
        }
      } else {
        setActionFeedback({
          type: 'error',
          message: res?.error || 'Falha ao disparar pelo Bot MOVY. Verifique a instância da Evolution API.',
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err?.response?.data?.message || 'Erro ao comunicar com o servidor.',
      });
    } finally {
      setIsSendingBot(false);
    }
  };

  const handleToggleConfirmed = async () => {
    const newStatus = !lead.meetingConfirmedByLead;
    try {
      const res = await sendMeetingConfirmation(lead.id, {
        milestone: activeMilestone,
        sendViaBot: false,
        markAsConfirmed: newStatus,
      });
      if (res?.updatedLead && onLeadUpdated) {
        onLeadUpdated(res.updatedLead);
      }
      setActionFeedback({
        type: 'success',
        message: newStatus ? 'Reunião marcada como confirmada pelo lead!' : 'Status de confirmação redefinido.',
      });
    } catch (err: any) {
      alert('Não foi possível atualizar o status de confirmação.');
    }
  };

  if (!lead.meetingDate) {
    return null;
  }

  const is24hSent = lead.meetingReminder24hSent;
  const is12hSent = lead.meetingReminder12hSent;
  const is1hSent = lead.meetingReminder1hSent;

  return (
    <div className="rounded-2xl border border-white/10 bg-surface-card p-5 shadow-sm space-y-4">
      {/* Header do Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-text-primary tracking-wide">
                Régua de Confirmação & Show-Rate
              </h3>
              {lead.meetingConfirmedByLead && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Presença Confirmada
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-0.5 capitalize">
              Reunião: <span className="text-white font-medium">{formattedDateTime}</span>
            </p>
          </div>
        </div>

        {/* Botão de Toggle "Confirmado pelo Lead" */}
        <button
          onClick={handleToggleConfirmed}
          className={`self-start sm:self-auto px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
            lead.meetingConfirmedByLead
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
              : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          <UserCheck className="h-3.5 w-3.5" />
          <span>{lead.meetingConfirmedByLead ? 'Confirmada pelo Lead' : 'Marcar como Confirmada'}</span>
        </button>
      </div>

      {/* Abas dos 3 Marcos (24h, 12h, 1h) */}
      <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-surface-canvas border border-white/5">
        {/* Marco 24h */}
        <button
          onClick={() => setActiveMilestone('24H')}
          className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg text-xs font-medium transition-all ${
            activeMilestone === '24H'
              ? 'bg-white/10 text-white shadow-sm border border-white/15'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>24h Antes</span>
          </div>
          <span
            className={`text-[10px] mt-0.5 font-medium ${
              is24hSent ? 'text-emerald-400' : 'text-zinc-500'
            }`}
          >
            {is24hSent ? '✓ Enviado' : 'Pendente'}
          </span>
        </button>

        {/* Marco 12h */}
        <button
          onClick={() => setActiveMilestone('12H')}
          className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg text-xs font-medium transition-all ${
            activeMilestone === '12H'
              ? 'bg-white/10 text-white shadow-sm border border-white/15'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>12h Antes</span>
          </div>
          <span
            className={`text-[10px] mt-0.5 font-medium ${
              is12hSent ? 'text-emerald-400' : 'text-zinc-500'
            }`}
          >
            {is12hSent ? '✓ Enviado' : 'Pendente'}
          </span>
        </button>

        {/* Marco 1h */}
        <button
          onClick={() => setActiveMilestone('1H')}
          className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg text-xs font-medium transition-all ${
            activeMilestone === '1H'
              ? 'bg-white/10 text-white shadow-sm border border-white/15'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>1h Antes</span>
          </div>
          <span
            className={`text-[10px] mt-0.5 font-medium ${
              is1hSent ? 'text-emerald-400' : 'text-zinc-500'
            }`}
          >
            {is1hSent ? '✓ Enviado' : 'Pendente'}
          </span>
        </button>
      </div>

      {/* Campo Opcional de Link do Meet para o marco de 1h */}
      {activeMilestone === '1H' && (
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-text-muted flex items-center gap-1">
            <LinkIcon className="h-3 w-3" />
            Link da Sala (Opcional - Google Meet / Zoom):
          </label>
          <input
            type="text"
            placeholder="Ex: https://meet.google.com/abc-defg-hij"
            value={meetLink}
            onChange={(e) => handleMeetLinkChange(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-surface-canvas border border-white/10 rounded-lg text-text-primary focus:border-brand focus:outline-none placeholder:text-text-muted/50"
          />
        </div>
      )}

      {/* Textarea com o Script Personalizado */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-text-muted">
            Script Formatado ({activeMilestone}):
          </span>
          <span className="text-[10px] text-zinc-500">
            Você pode editar livremente o texto abaixo antes do envio
          </span>
        </div>
        <textarea
          rows={5}
          value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          className="w-full p-3 text-xs bg-surface-canvas border border-white/10 rounded-xl text-text-primary focus:border-brand focus:outline-none leading-relaxed font-sans resize-none"
        />
      </div>

      {/* Feedback de Ação */}
      {actionFeedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}
        >
          {actionFeedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          )}
          <span>{actionFeedback.message}</span>
        </div>
      )}

      {/* Barra de Ações */}
      <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-white/5">
        {/* Copiar */}
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copied ? 'Copiado!' : 'Copiar Script'}</span>
        </button>

        {/* Abrir WhatsApp Web */}
        <button
          type="button"
          onClick={handleOpenWhatsAppWeb}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-zinc-300 hover:text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/10 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span>Abrir no WhatsApp Web</span>
        </button>

        {/* Disparo 1-Click via Bot MOVY */}
        <button
          type="button"
          disabled={isSendingBot}
          onClick={handleSendViaBot}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-all shadow-md shadow-emerald-600/20 active:scale-95"
        >
          {isSendingBot ? (
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          <span>{isSendingBot ? 'Enviando...' : 'Disparar via Bot MOVY'}</span>
        </button>
      </div>
    </div>
  );
}
