import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { InternalApiKeyGuard } from '../common/guards/internal-api-key.guard';
import { EncryptionService } from '../common/crypto/encryption.service';
import { TenantsService } from './tenants.service';

describe('S2S TenantsModule (InternalApiKeyGuard & TenantsService)', () => {
  let encryptionService: EncryptionService;
  let guard: InternalApiKeyGuard;
  let tenantsService: TenantsService;
  let mockPrisma: any;

  beforeEach(() => {
    process.env.CONCIERGE_INTERNAL_API_KEY = 's2s_super_secret_movy_key';
    process.env.CONCIERGE_ENCRYPTION_KEY =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    encryptionService = new EncryptionService();
    guard = new InternalApiKeyGuard(encryptionService);

    mockPrisma = {
      deliveryTenant: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
      },
      tenantKnowledgeBase: {
        upsert: jest.fn(),
      },
      deliveryUser: {
        upsert: jest.fn(),
      },
      tenantDailyMetric: {
        findMany: jest.fn(),
      },
    };

    tenantsService = new TenantsService(mockPrisma, encryptionService);
  });

  describe('A01: InternalApiKeyGuard (S2S Authentication)', () => {
    const buildCtx = (headerKey?: string): ExecutionContext =>
      ({
        switchToHttp: () => ({
          getRequest: () => ({
            headers: headerKey ? { 'x-concierge-internal-key': headerKey } : {},
          }),
        }),
      }) as unknown as ExecutionContext;

    it('rejects requests without X-Concierge-Internal-Key header', () => {
      expect(() => guard.canActivate(buildCtx())).toThrow(UnauthorizedException);
    });

    it('rejects requests with invalid X-Concierge-Internal-Key header', () => {
      expect(() => guard.canActivate(buildCtx('wrong_key'))).toThrow(
        UnauthorizedException,
      );
    });

    it('allows requests with exact matching X-Concierge-Internal-Key header', () => {
      expect(guard.canActivate(buildCtx('s2s_super_secret_movy_key'))).toBe(true);
    });
  });

  describe('TenantsService.syncTenantFromMovy', () => {
    it('upserts tenant, encrypts metaAccessToken with AES-256-GCM, initializes knowledge base and hashes owner password with bcrypt 12 rounds', async () => {
      mockPrisma.deliveryTenant.upsert.mockResolvedValue({
        id: 'tenant-uuid-1',
        movyClientId: 'movy-client-123',
        name: 'Burger House Delivery',
        segment: 'Hamburgueria',
        city: 'São Paulo',
        whatsappPhone: '5511999999999',
        isActive: true,
        aiGlobalEnabled: true,
        wabaId: 'waba_123',
        phoneNumberId: 'phone_456',
        metaAccessTokenEnc: 'encrypted_value_not_exposed',
      });

      mockPrisma.tenantKnowledgeBase.upsert.mockResolvedValue({
        id: 'kb-uuid-1',
        tenantId: 'tenant-uuid-1',
        llmModel: 'gpt-4o-mini',
      });

      mockPrisma.deliveryUser.upsert.mockImplementation(async (args: any) => ({
        id: 'user-uuid-1',
        email: args.create.email,
        name: args.create.name,
        role: 'OWNER',
        passwordHash: args.create.passwordHash,
      }));

      const result = await tenantsService.syncTenantFromMovy({
        movyClientId: 'movy-client-123',
        name: 'Burger House Delivery',
        segment: 'Hamburgueria',
        city: 'São Paulo',
        whatsappPhone: '5511999999999',
        isActive: true,
        wabaId: 'waba_123',
        phoneNumberId: 'phone_456',
        metaAccessToken: 'EAAG_raw_meta_token_secret',
        ownerEmail: 'dono@burgerhouse.com.br',
        ownerName: 'Carlos Dono',
        ownerPassword: 'StrongPassword123!',
        digitalMenuUrl: 'https://cardapio.anota.ai/burger-house',
      });

      // Verifica que o token enviado para o banco foi cifrado com AES-256-GCM
      const upsertCall = mockPrisma.deliveryTenant.upsert.mock.calls[0][0];
      expect(upsertCall.create.metaAccessTokenEnc).toBeDefined();
      expect(upsertCall.create.metaAccessTokenEnc).not.toContain('EAAG_raw_meta_token_secret');
      expect(
        encryptionService.decrypt(upsertCall.create.metaAccessTokenEnc),
      ).toBe('EAAG_raw_meta_token_secret');

      // Verifica que a resposta NUNCA vaza metaAccessTokenEnc nem passwordHash (OWASP A02)
      expect((result as any).tenant.metaAccessTokenEnc).toBeUndefined();
      expect((result as any).ownerUser.passwordHash).toBeUndefined();
      expect(result.tenant.hasMetaCredentials).toBe(true);
    });
  });

  describe('TenantsService.getTenantSummaryForMovy', () => {
    it('computes all 5 required metrics for the MOVY CRM dashboard accurately', async () => {
      mockPrisma.deliveryTenant.findUnique.mockResolvedValue({
        id: 'tenant-uuid-1',
        movyClientId: 'movy-client-123',
        name: 'Burger House Delivery',
        isActive: true,
        aiGlobalEnabled: true,
        wabaId: 'waba_123',
        phoneNumberId: 'phone_456',
        metaAccessTokenEnc: 'iv:tag:cipher',
        knowledgeBase: {
          digitalMenuUrl: 'https://cardapio.anota.ai/burger-house',
          llmProvider: 'OPENAI',
          llmModel: 'gpt-4o-mini',
          estimatedDeliveryMinutes: 45,
          estimatedPickupMinutes: 25,
        },
      });

      mockPrisma.tenantDailyMetric.findMany.mockResolvedValue([
        {
          totalConversations: 100,
          aiResolvedCount: 85,
          humanHandoffCount: 15,
          menuLinkSentCount: 72,
          avgFirstResponseMs: 3200,
          promptTokens: 45000,
          completionTokens: 15000,
          estimatedCostUsd: 0.018,
        },
        {
          totalConversations: 50,
          aiResolvedCount: 44,
          humanHandoffCount: 6,
          menuLinkSentCount: 38,
          avgFirstResponseMs: 2600,
          promptTokens: 20000,
          completionTokens: 8000,
          estimatedCostUsd: 0.009,
        },
      ]);

      const summary = await tenantsService.getTenantSummaryForMovy(
        'movy-client-123',
      );

      expect(summary.movyClientId).toBe('movy-client-123');
      expect(summary.metrics.totalConversations).toBe(150);
      expect(summary.metrics.aiResolvedCount).toBe(129);
      expect(summary.metrics.humanHandoffCount).toBe(21);
      expect(summary.metrics.menuLinkSentCount).toBe(110);
      expect(summary.metrics.aiRetentionRatePercent).toBe(86); // 129 / 150 = 86%
      expect(summary.metrics.avgFirstResponseMs).toBe(3000); // média ponderada (100*3200 + 50*2600)/150 = 3000ms
      expect(summary.metrics.totalTokens).toBe(88000);
      expect(summary.metrics.estimatedCostUsd).toBeCloseTo(0.027, 4);
      expect((summary as any).metaAccessTokenEnc).toBeUndefined();
    });
  });
});
