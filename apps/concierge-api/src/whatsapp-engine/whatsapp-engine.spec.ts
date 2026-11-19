import {
  ExecutionContext,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { MetaSignatureGuard } from './guards/meta-signature.guard';
import { EconomicalLlmService } from './llm/economical-llm.service';
import { MetaCloudApiService } from './meta/meta-cloud-api.service';
import { MetricsRecorderService } from './metrics/metrics-recorder.service';
import { MetaWebhookService } from './webhooks/meta-webhook.service';
import { ConversationsService } from './conversations/conversations.service';
import { RedisService } from '../redis/redis.service';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service';
import { EncryptionService } from '../common/crypto/encryption.service';

describe('WhatsApp Coexistence & Economical AI Engine (TDD & OWASP Top 5)', () => {
  const APP_SECRET = 'test_meta_app_secret_2026';
  let signatureGuard: MetaSignatureGuard;
  let llmService: EconomicalLlmService;
  let redisService: RedisService;
  let encryptionService: EncryptionService;
  let metaCloudApi: MetaCloudApiService;
  let metricsRecorder: MetricsRecorderService;
  let kbService: KnowledgeBaseService;
  let webhookService: MetaWebhookService;
  let conversationsService: ConversationsService;
  let mockPrisma: any;

  beforeEach(() => {
    process.env.META_APP_SECRET = APP_SECRET;
    process.env.CONCIERGE_ENCRYPTION_KEY =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    signatureGuard = new MetaSignatureGuard();
    llmService = new EconomicalLlmService();
    redisService = new RedisService();
    encryptionService = new EncryptionService();
    metaCloudApi = new MetaCloudApiService(encryptionService);

    jest.spyOn(metaCloudApi, 'sendTextMessage').mockResolvedValue({
      sent: true,
      metaMessageId: 'wamid.outbound_ai_1',
    });

    const tenantRecord = {
      id: 'tenant-1',
      movyClientId: 'movy-client-1',
      name: 'Burger Box Delivery',
      segment: 'Hamburgueria',
      city: 'São Paulo',
      isActive: true,
      aiGlobalEnabled: true,
      phoneNumberId: 'phone_123',
      metaAccessTokenEnc: encryptionService.encrypt('EAAG_valid_token'),
      knowledgeBase: {
        digitalMenuUrl: 'https://cardapio.anota.ai/burger-box',
        openingHoursText: '18h às 23h30',
        estimatedDeliveryMinutes: 40,
        estimatedPickupMinutes: 20,
        deliveryFeeRules: 'A partir de R$ 5',
        paymentMethods: 'Pix e Cartão',
        agentName: 'Nina',
        toneOfVoice: 'Simpática e direta',
        llmProvider: 'OPENAI',
        llmModel: 'gpt-4o-mini',
        customInstructions: 'Combo duplo por R$ 34,90 hoje',
        handoffTriggers: 'Reclamação de atraso ou pedido errado',
      },
    };

    const conversationsMap = new Map<string, any>();
    const messagesList: any[] = [];
    let dailyMetricRow: any = null;

    mockPrisma = {
      deliveryTenant: {
        findUnique: jest.fn().mockImplementation(async ({ where }: any) => {
          if (
            where.phoneNumberId === 'phone_123' ||
            where.id === 'tenant-1'
          ) {
            return tenantRecord;
          }
          return null;
        }),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      conversationMessage: {
        findUnique: jest
          .fn()
          .mockImplementation(async ({ where }: any) =>
            messagesList.find((m) => m.metaMessageId === where.metaMessageId) ||
            null,
          ),
        create: jest.fn().mockImplementation(async ({ data }: any) => {
          const msg = { id: `msg_${messagesList.length + 1}`, createdAt: new Date(), ...data };
          messagesList.push(msg);
          return msg;
        }),
        findMany: jest.fn().mockImplementation(async ({ where }: any) =>
          messagesList.filter((m) => m.conversationId === where.conversationId),
        ),
      },
      conversation: {
        findUnique: jest.fn().mockImplementation(async ({ where }: any) => {
          const key = `${where.tenantId_customerPhone.tenantId}:${where.tenantId_customerPhone.customerPhone}`;
          return conversationsMap.get(key) || null;
        }),
        upsert: jest
          .fn()
          .mockImplementation(async ({ where, create, update }: any) => {
            const key = `${where.tenantId_customerPhone.tenantId}:${where.tenantId_customerPhone.customerPhone}`;
            const existing = conversationsMap.get(key);
            if (!existing) {
              const created = {
                id: `conv_${conversationsMap.size + 1}`,
                menuLinkSent: false,
                firstResponseMs: null,
                ...create,
              };
              conversationsMap.set(key, created);
              return created;
            }
            const updated = { ...existing, ...update };
            conversationsMap.set(key, updated);
            return updated;
          }),
        update: jest.fn().mockImplementation(async ({ where, data }: any) => {
          for (const [k, v] of conversationsMap.entries()) {
            if (v.id === where.id) {
              const updated = { ...v, ...data };
              conversationsMap.set(k, updated);
              return updated;
            }
          }
          return null;
        }),
        findFirst: jest.fn().mockImplementation(async ({ where }: any) => {
          for (const v of conversationsMap.values()) {
            if (v.id === where.id && v.tenantId === where.tenantId) {
              return { ...v, messages: messagesList.filter((m) => m.conversationId === v.id) };
            }
          }
          return null;
        }),
        findMany: jest.fn().mockImplementation(async ({ where }: any) => {
          return Array.from(conversationsMap.values())
            .filter(
              (v) =>
                v.tenantId === where.tenantId &&
                (!where.status || v.status === where.status),
            )
            .map((v) => ({
              ...v,
              messages: messagesList.filter((m) => m.conversationId === v.id),
            }));
        }),
      },
      tenantDailyMetric: {
        findUnique: jest.fn().mockImplementation(async () => dailyMetricRow),
        create: jest.fn().mockImplementation(async ({ data }: any) => {
          dailyMetricRow = { id: 'metric-1', ...data };
          return dailyMetricRow;
        }),
        update: jest.fn().mockImplementation(async ({ data }: any) => {
          dailyMetricRow = { ...dailyMetricRow, ...data };
          return dailyMetricRow;
        }),
      },
      _getDailyMetric: () => dailyMetricRow,
    };

    metricsRecorder = new MetricsRecorderService(mockPrisma);
    kbService = new KnowledgeBaseService(mockPrisma);
    webhookService = new MetaWebhookService(
      mockPrisma,
      redisService,
      kbService,
      llmService,
      metaCloudApi,
      metricsRecorder,
    );
    conversationsService = new ConversationsService(
      mockPrisma,
      metricsRecorder,
    );
  });

  describe('OWASP A02: MetaSignatureGuard (HMAC-SHA256 verification)', () => {
    it('accepts webhook request with valid X-Hub-Signature-256 HMAC and rejects forged payloads', () => {
      const rawBody = Buffer.from(JSON.stringify({ object: 'whatsapp_business_account' }), 'utf8');
      const validSig =
        'sha256=' +
        crypto.createHmac('sha256', APP_SECRET).update(rawBody).digest('hex');

      const validCtx = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { 'x-hub-signature-256': validSig },
            rawBody,
          }),
        }),
      } as unknown as ExecutionContext;

      expect(signatureGuard.canActivate(validCtx)).toBe(true);

      const forgedCtx = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { 'x-hub-signature-256': 'sha256=deadbeef123456' },
            rawBody,
          }),
        }),
      } as unknown as ExecutionContext;

      expect(() => signatureGuard.canActivate(forgedCtx)).toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('OWASP LLM05: Improper Output Handling (URL Hijacking Prevention)', () => {
    it('replaces any unauthorized or phishing URL generated by the LLM with the official digitalMenuUrl', () => {
      const maliciousLlmJson = JSON.stringify({
        replyText:
          'Peça agora com desconto em https://phishing-attack.evil.com/checkout ou http://169.254.169.254/meta',
        sentMenuLink: true,
        requiresHumanHandoff: false,
      });

      const decision = llmService.sanitizeModelDecision(
        maliciousLlmJson,
        'https://cardapio.anota.ai/burger-box',
        200,
        50,
        'gpt-4o-mini',
      );

      expect(decision.replyText).not.toContain('phishing-attack.evil.com');
      expect(decision.replyText).not.toContain('169.254.169.254');
      expect(decision.replyText).toContain('https://cardapio.anota.ai/burger-box');
      expect(decision.estimatedCostUsd).toBeGreaterThan(0);
    });
  });

  describe('WhatsApp Coexistence & Triage State Machine', () => {
    it('answers customer inquiry, sends digital menu link and records all 5 metrics in TenantDailyMetric', async () => {
      const payload = {
        entry: [
          {
            changes: [
              {
                field: 'messages',
                value: {
                  metadata: { phone_number_id: 'phone_123' },
                  contacts: [
                    { wa_id: '5511988881111', profile: { name: 'João Cliente' } },
                  ],
                  messages: [
                    {
                      id: 'wamid.inbound_1',
                      from: '5511988881111',
                      type: 'text',
                      text: { body: 'Oi! Vocês estão abertos? Manda o cardápio' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const res = await webhookService.handleMetaWebhookPayload(payload);
      expect(res.results[0].status).toBe('ai_replied');
      expect(res.results[0].sentMenuLink).toBe(true);
      expect(metaCloudApi.sendTextMessage).toHaveBeenCalledTimes(1);

      const metric = mockPrisma._getDailyMetric();
      expect(metric.totalConversations).toBe(1);
      expect(metric.aiResolvedCount).toBe(1);
      expect(metric.humanHandoffCount).toBe(0);
      expect(metric.menuLinkSentCount).toBe(1);
      expect(metric.avgFirstResponseMs).toBeGreaterThan(0);
      expect(metric.promptTokens).toBeGreaterThan(0);
      expect(metric.estimatedCostUsd).toBeGreaterThan(0);

      // Idempotência: se a Meta reenviar o mesmo wamid.inbound_1, ignora sem gastar tokens
      const retryRes = await webhookService.handleMetaWebhookPayload(payload);
      expect(retryRes.results[0].status).toBe('duplicate_ignored');
      expect(metaCloudApi.sendTextMessage).toHaveBeenCalledTimes(1);
    });

    it('detects Coexistence Echo (smb_message_echoes) when human attendant replies on mobile and pauses AI automatically', async () => {
      const echoPayload = {
        entry: [
          {
            changes: [
              {
                field: 'smb_message_echoes',
                value: {
                  metadata: { phone_number_id: 'phone_123' },
                  message_echoes: [
                    {
                      id: 'wamid.echo_human_1',
                      from: '5511999990000',
                      to: '5511977772222',
                      type: 'text',
                      text: { body: 'Oi! Aqui é o Lucas do caixa, já estou vendo seu pedido.' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const echoRes = await webhookService.handleMetaWebhookPayload(echoPayload);
      expect(echoRes.results[0].status).toBe('coexistence_human_handoff');

      // Quando o cliente 5511977772222 responder de volta, a IA NÃO deve responder pois o humano assumiu
      const customerFollowUp = {
        entry: [
          {
            changes: [
              {
                field: 'messages',
                value: {
                  metadata: { phone_number_id: 'phone_123' },
                  messages: [
                    {
                      id: 'wamid.inbound_after_echo',
                      from: '5511977772222',
                      type: 'text',
                      text: { body: 'Obrigado Lucas!' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const followUpRes =
        await webhookService.handleMetaWebhookPayload(customerFollowUp);
      expect(followUpRes.results[0].status).toBe('paused_in_human_handoff');
      expect(metaCloudApi.sendTextMessage).not.toHaveBeenCalled();
    });

    it('transfers to HUMAN_HANDOFF queue when customer complains about delayed/wrong order and allows attendant to resolve back to AI', async () => {
      const complaintPayload = {
        entry: [
          {
            changes: [
              {
                field: 'messages',
                value: {
                  metadata: { phone_number_id: 'phone_123' },
                  contacts: [
                    { wa_id: '5511966663333', profile: { name: 'Carla' } },
                  ],
                  messages: [
                    {
                      id: 'wamid.complaint_1',
                      from: '5511966663333',
                      type: 'text',
                      text: {
                        body: 'Meu pedido está atrasado há 1 hora e veio errado! Quero falar com um atendente',
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const res = await webhookService.handleMetaWebhookPayload(complaintPayload);
      expect(res.results[0].status).toBe('ai_transferred_to_human');

      const queue = await conversationsService.listHandoffQueue('tenant-1');
      expect(queue).toHaveLength(1);
      expect(queue[0].customerPhone).toBe('5511966663333');
      expect(queue[0].handoffReason).toBeTruthy();
      expect(queue[0].whatsappDeepLink).toBe('https://wa.me/5511966663333');

      // OWASP A01 Anti-IDOR: Tenant-2 tenta resolver a conversa do Tenant-1 e toma NotFoundException
      await expect(
        conversationsService.resolveAndReturnToAi('tenant-2', queue[0].id),
      ).rejects.toThrow(NotFoundException);

      // Tenant-1 resolve e devolve para a IA
      const resolved = await conversationsService.resolveAndReturnToAi(
        'tenant-1',
        queue[0].id,
      );
      expect(resolved.status).toBe('AI_ACTIVE');
    });
  });
});
