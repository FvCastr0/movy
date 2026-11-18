import { Test, TestingModule } from '@nestjs/testing';
import { MetaAdsService } from './meta-ads.service';
import { PrismaService } from '../prisma/prisma.service';
import { encryptToken, decryptToken } from '../common/utils/crypto.util';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';

describe('MetaAdsService', () => {
  let service: MetaAdsService;
  let prisma: PrismaService;

  const mockKey = '87fda1b51f69ce6a8ce119f34f44eabc1db6e2c7dc5f41f12369622795be6574';
  process.env.META_ENCRYPTION_KEY = mockKey;

  const mockClient = {
    id: 'client-123',
    deliveryNome: 'Burger Mania Delivery',
    metaAdAccountId: 'act_9988776655',
    metaAccessTokenEnc: encryptToken('EAABw_fake_access_token_123', mockKey),
    metaTokenStatus: 'ACTIVE',
    metaTokenCreatedAt: new Date(),
    metaTokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    metaLastSyncAt: new Date(),
  };

  const mockPrismaService = {
    client: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    adAccountMetrics: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    clientRevenueReport: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetaAdsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MetaAdsService>(MetaAdsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('Criptografia AES-256-GCM', () => {
    it('deve cifrar e decifrar perfeitamente um token de acesso da Meta', () => {
      const originalToken = 'EAABw_super_secret_meta_marketing_api_token_2026';
      const cipherText = encryptToken(originalToken, mockKey);

      expect(cipherText).not.toEqual(originalToken);
      expect(cipherText.split(':').length).toBe(3); // iv:authTag:encrypted

      const decrypted = decryptToken(cipherText, mockKey);
      expect(decrypted).toEqual(originalToken);
    });

    it('deve lançar erro se a chave mestra for inválida', () => {
      expect(() => encryptToken('token', 'chave_curta')).toThrow();
    });
  });

  describe('fetchAccountInsights (Agregação & Anti-Banimento)', () => {
    it('deve consolidar métricas da conta e extrair conversas de WhatsApp do array actions', async () => {
      mockPrismaService.client.findUnique.mockResolvedValue(mockClient);
      mockPrismaService.client.update.mockResolvedValue(mockClient);

      // Mock da resposta da Graph API
      const metaApiResponse = {
        data: [
          {
            spend: '1450.50',
            impressions: '32000',
            clicks: '850',
            ctr: '2.65',
            cpc: '1.70',
            actions: [
              { action_type: 'link_click', value: '850' },
              { action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '62' },
              { action_type: 'contact', value: '8' },
            ],
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => '{"call_count":12,"total_cputime":5,"total_time":8}' },
        json: async () => metaApiResponse,
      } as any);

      const result = await service.fetchAccountInsights('client-123', {
        since: '2026-11-01',
        until: '2026-11-07',
      });

      expect(result.clientId).toBe('client-123');
      expect(result.spend).toBe(1450.5);
      expect(result.impressions).toBe(32000);
      expect(result.clicks).toBe(850);
      expect(result.conversas).toBe(70); // 62 + 8
      expect(result.cpa).toBe(Number((1450.5 / 70).toFixed(2)));
      expect(result.cached).toBe(false);
    });

    it('deve retornar do cache em memória na segunda chamada idêntica (TTL de 15 minutos)', async () => {
      mockPrismaService.client.findUnique.mockResolvedValue(mockClient);
      mockPrismaService.client.update.mockResolvedValue(mockClient);

      const metaApiResponse = {
        data: [{ spend: '1450.50', impressions: '32000', clicks: '850', ctr: '2.65', cpc: '1.70', actions: [] }],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => null },
        json: async () => metaApiResponse,
      } as any);

      // Primeira chamada (popula o cache)
      const firstResult = await service.fetchAccountInsights('client-123', {
        since: '2026-11-01',
        until: '2026-11-07',
      });
      expect(firstResult.cached).toBe(false);

      // Segunda chamada com o mesmo período (deve vir do cache em memória)
      const cachedResult = await service.fetchAccountInsights('client-123', {
        since: '2026-11-01',
        until: '2026-11-07',
      });

      expect(cachedResult.cached).toBe(true);
      expect(cachedResult.spend).toBe(1450.5);
      // Confirma que fetch foi chamado apenas uma vez!
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('deve marcar o token como EXPIRED se a Meta retornar erro OAuth 190', async () => {
      mockPrismaService.client.findUnique.mockResolvedValue(mockClient);
      mockPrismaService.client.update.mockResolvedValue({ ...mockClient, metaTokenStatus: 'EXPIRED' });

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        headers: { get: () => null },
        json: async () => ({
          error: {
            code: 190,
            message: 'Error validating access token: Session has expired.',
          },
        }),
      } as any);

      await expect(
        service.fetchAccountInsights('client-123', {
          since: '2026-11-10',
          until: '2026-11-17',
          force: 'true',
        })
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrismaService.client.update).toHaveBeenCalledWith({
        where: { id: 'client-123' },
        data: { metaTokenStatus: 'EXPIRED' },
      });
    });
  });
});
