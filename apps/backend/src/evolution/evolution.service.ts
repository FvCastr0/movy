import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface LeadNotificationPayload {
  nome: string;
  whatsapp: string;
  deliveryNome: string;
  segmento: string;
  cidade: string;
  createdAt: Date;
}

@Injectable()
export class EvolutionService {
  private readonly logger = new Logger(EvolutionService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendLeadNotification(lead: LeadNotificationPayload): Promise<{ success: boolean; error?: string }> {
    const apiUrl = this.configService.get<string>('EVOLUTION_API_URL', 'http://localhost:8080');
    const apiKey = this.configService.get<string>('EVOLUTION_API_KEY', 'movy_secret_key_whatsapp_2026');
    const rawInstance = this.configService.get<string>('EVOLUTION_INSTANCE_NAME', 'bot movy');
    const groupJid = this.configService.get<string>('WHATSAPP_GROUP_JID', '120363413821500503@g.us');

    const instanceName = encodeURIComponent(rawInstance);
    const endpoint = `${apiUrl}/message/sendText/${instanceName}`;

    const formattedDate = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'America/Sao_Paulo',
    }).format(lead.createdAt);

    const messageText = [
      '🔔 *NOVO LEAD RECEBIDO — MOVY*',
      '',
      `👤 *Nome:* ${lead.nome}`,
      `📱 *WhatsApp:* ${lead.whatsapp}`,
      `🍕 *Delivery:* ${lead.deliveryNome}`,
      `🏷️ *Segmento:* ${lead.segmento}`,
      `📍 *Cidade:* ${lead.cidade}`,
      `⏱️ *Data/Hora:* ${formattedDate}`,
      '',
      '👉 _Acesse o painel MOVY para iniciar a qualificação do lead._',
    ].join('\n');

    try {
      this.logger.log(`Disparando notificação de lead para o grupo ${groupJid} via Evolution API (${rawInstance})...`);
      
      const response = await axios.post(
        endpoint,
        {
          number: groupJid,
          text: messageText,
        },
        {
          headers: {
            apikey: apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 8000,
        },
      );

      this.logger.log(`Notificação WhatsApp enviada com sucesso para o lead ${lead.deliveryNome}. Status: ${response.status}`);
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      this.logger.error(`Falha no envio para Evolution API: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Dispara documento PDF e mensagem executiva diretamente para o WhatsApp do cliente.
   */
  async sendReportPdfMedia(
    whatsapp: string,
    pdfBase64OrUrl: string,
    fileName: string,
    caption: string,
  ): Promise<{ success: boolean; error?: string }> {
    const apiUrl = this.configService.get<string>('EVOLUTION_API_URL', 'http://localhost:8080');
    const apiKey = this.configService.get<string>('EVOLUTION_API_KEY', 'movy_secret_key_whatsapp_2026');
    const rawInstance = this.configService.get<string>('EVOLUTION_INSTANCE_NAME', 'bot movy');

    const cleanNumber = whatsapp.replace(/\D/g, '');
    const recipientNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;

    // Evolution API v2 exige Base64 puro (sem o prefixo Data URI 'data:application/pdf;base64,') ou URL
    const cleanMedia = pdfBase64OrUrl.replace(/^data:[^;]+;base64,/, '');

    const instanceName = encodeURIComponent(rawInstance);
    const endpoint = `${apiUrl}/message/sendMedia/${instanceName}`;

    try {
      this.logger.log(`Enviando relatório em PDF para o cliente no WhatsApp ${recipientNumber}...`);

      const response = await axios.post(
        endpoint,
        {
          number: recipientNumber,
          mediatype: 'document',
          mimetype: 'application/pdf',
          caption,
          media: cleanMedia,
          fileName,
        },
        {
          headers: {
            apikey: apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 20000,
        },
      );

      this.logger.log(`PDF enviado com sucesso para ${recipientNumber}. Status: ${response.status}`);
      return { success: true };
    } catch (error: any) {
      const rawData = error.response?.data;
      let friendlyError = error.message;

      if (rawData) {
        const msg = rawData?.response?.message;
        if (Array.isArray(msg) && msg[0]?.exists === false) {
          friendlyError = `O número ${whatsapp} (${recipientNumber}) não possui conta ativa no WhatsApp. Verifique o telefone do cliente.`;
        } else if (Array.isArray(msg)) {
          friendlyError = msg.map((m) => (typeof m === 'string' ? m : JSON.stringify(m))).join(', ');
        } else {
          friendlyError = JSON.stringify(rawData);
        }
      }

      this.logger.error(`Erro ao enviar mídia PDF via Evolution API: ${friendlyError}`);
      return { success: false, error: friendlyError };
    }
  }

  /**
   * Envia uma mensagem de texto arbitrária diretamente para um número ou JID de WhatsApp.
   * Utilizado para notificações de demandas, lembretes de reuniões e avisos internos.
   */
  async sendCustomTextMessage(
    recipientNumberOrJid: string,
    message: string,
  ): Promise<{ success: boolean; error?: string }> {
    const apiUrl = this.configService.get<string>('EVOLUTION_API_URL', 'http://localhost:8080');
    const apiKey = this.configService.get<string>('EVOLUTION_API_KEY', 'movy_secret_key_whatsapp_2026');
    const rawInstance = this.configService.get<string>('EVOLUTION_INSTANCE_NAME', 'bot movy');

    let recipient = recipientNumberOrJid.trim();
    if (!recipient.includes('@')) {
      const cleanDigits = recipient.replace(/\D/g, '');
      recipient = cleanDigits.startsWith('55') ? cleanDigits : `55${cleanDigits}`;
    }

    const instanceName = encodeURIComponent(rawInstance);
    const endpoint = `${apiUrl}/message/sendText/${instanceName}`;

    try {
      this.logger.log(`Enviando mensagem de texto personalizada via WhatsApp para ${recipient}...`);

      const response = await axios.post(
        endpoint,
        {
          number: recipient,
          text: message,
        },
        {
          headers: {
            apikey: apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );

      this.logger.log(`Mensagem de texto enviada com sucesso para ${recipient}. Status: ${response.status}`);
      return { success: true };
    } catch (error: any) {
      const rawData = error.response?.data;
      const errorMsg = rawData ? JSON.stringify(rawData) : error.message;
      this.logger.error(`Falha no envio de texto WhatsApp para ${recipient}: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }
}
