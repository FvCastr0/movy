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
}
