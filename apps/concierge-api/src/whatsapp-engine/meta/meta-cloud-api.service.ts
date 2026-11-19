import { Injectable, Logger } from '@nestjs/common';
import { EncryptionService } from '../../common/crypto/encryption.service';

@Injectable()
export class MetaCloudApiService {
  private readonly logger = new Logger(MetaCloudApiService.name);

  constructor(private readonly encryptionService: EncryptionService) {}

  /**
   * Decifra o `metaAccessTokenEnc` just-in-time em memória e envia mensagem de texto
   * via Meta WhatsApp Cloud API Oficial (v21.0).
   */
  async sendTextMessage(params: {
    phoneNumberId: string;
    metaAccessTokenEnc: string;
    recipientPhone: string;
    text: string;
  }): Promise<{ sent: boolean; metaMessageId?: string }> {
    const accessToken = this.encryptionService.decrypt(
      params.metaAccessTokenEnc,
    );

    if (process.env.NODE_ENV === 'test' && !global.fetch) {
      return { sent: true, metaMessageId: `wamid.test_${Date.now()}` };
    }

    const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(
      params.phoneNumberId,
    )}/messages`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: params.recipientPhone,
          type: 'text',
          text: {
            preview_url: true,
            body: params.text,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        this.logger.warn(
          `Meta Cloud API error (status ${response.status}) for phoneNumberId ${params.phoneNumberId}`,
        );
        return { sent: false };
      }

      const data = (await response.json()) as {
        messages?: Array<{ id?: string }>;
      };
      return {
        sent: true,
        metaMessageId: data?.messages?.[0]?.id,
      };
    } catch (err) {
      this.logger.warn(
        `Failed to call Meta Cloud API: ${
          err instanceof Error ? err.message : 'Unknown error'
        }`,
      );
      return { sent: false };
    } finally {
      clearTimeout(timeout);
    }
  }
}
