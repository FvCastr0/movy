import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface MetaAdsMetrics {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversas: number;
  costPerChat: number;
}

@Injectable()
export class MetaAdsService {
  private readonly logger = new Logger(MetaAdsService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Coleta métricas reais de insights de uma conta de anúncios na Meta Graph API
   * para um determinado período. Não gera dados aleatórios.
   */
  async getWeeklyInsights(
    actAccountId: string | null | undefined,
    startDate: Date,
    endDate: Date,
    strict = false,
  ): Promise<MetaAdsMetrics> {
    const token = this.configService.get<string>('META_ACCESS_TOKEN')?.trim();
    const rawAccount = actAccountId?.trim();

    if (!rawAccount || rawAccount === 'default_act') {
      const msg = 'ID da Conta de Anúncios (Meta Ads) não configurado para este cliente.';
      this.logger.warn(msg);
      if (strict) {
        throw new BadRequestException(msg);
      }
      return this.emptyMetrics();
    }

    if (!token || token === 'dummy_meta_token') {
      const msg =
        'META_ACCESS_TOKEN não configurado no arquivo .env. Configure o token da Meta Graph API ou preencha as métricas reais manualmente no formulário.';
      this.logger.warn(msg);
      if (strict) {
        throw new BadRequestException(msg);
      }
      return this.emptyMetrics();
    }

    // Normaliza ID da conta de anúncios
    const accountId = rawAccount.startsWith('act_')
      ? rawAccount
      : `act_${rawAccount}`;

    const since = startDate.toISOString().split('T')[0];
    const until = endDate.toISOString().split('T')[0];

    const endpoint = `https://graph.facebook.com/v19.0/${accountId}/insights`;

    try {
      this.logger.log(
        `Consultando Meta Graph API para a conta ${accountId} no período ${since} a ${until}...`,
      );

      const response = await axios.get(endpoint, {
        params: {
          access_token: token,
          time_range: JSON.stringify({ since, until }),
          fields: 'spend,impressions,clicks,ctr,cpc,actions',
        },
        timeout: 10000,
      });

      const data = response.data?.data?.[0];

      if (!data) {
        this.logger.log(
          `Nenhuma atividade ou gasto registrado na Meta Ads para ${accountId} entre ${since} e ${until}.`,
        );
        return this.emptyMetrics();
      }

      const spend = parseFloat(data.spend || '0');
      const impressions = parseInt(data.impressions || '0', 10);
      const clicks = parseInt(data.clicks || '0', 10);
      const ctr = parseFloat(data.ctr || '0');
      const cpc = parseFloat(data.cpc || '0');

      // Extrai conversas no WhatsApp/Direct das 'actions'
      let conversas = 0;
      if (Array.isArray(data.actions)) {
        const messagingActions = [
          'onsite_conversion.messaging_conversation_started_7d',
          'onsite_conversion.messaging_first_reply',
          'lead',
          'contact',
        ];

        for (const action of data.actions) {
          if (messagingActions.includes(action.action_type)) {
            conversas += parseInt(action.value || '0', 10);
          }
        }
      }

      const costPerChat = conversas > 0 ? parseFloat((spend / conversas).toFixed(2)) : 0;

      return {
        spend: parseFloat(spend.toFixed(2)),
        impressions,
        clicks,
        ctr: parseFloat(ctr.toFixed(2)),
        cpc: parseFloat(cpc.toFixed(2)),
        conversas,
        costPerChat,
      };
    } catch (error: any) {
      const apiError = error.response?.data?.error?.message || error.message;
      this.logger.error(`Falha ao consultar Meta Ads API (${accountId}): ${apiError}`);

      if (strict) {
        throw new BadRequestException(
          `Erro na Meta Graph API (${accountId}): ${apiError}`,
        );
      }

      return this.emptyMetrics();
    }
  }

  private emptyMetrics(): MetaAdsMetrics {
    return {
      spend: 0,
      impressions: 0,
      clicks: 0,
      ctr: 0,
      cpc: 0,
      conversas: 0,
      costPerChat: 0,
    };
  }
}
