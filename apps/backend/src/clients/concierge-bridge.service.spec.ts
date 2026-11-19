import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConciergeBridgeService } from './concierge-bridge.service';

describe('ConciergeBridgeService (MOVY CRM ↔ AI Concierge Microservice Bridge)', () => {
  let service: ConciergeBridgeService;
  let mockPrisma: any;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.CONCIERGE_API_URL = 'http://localhost:3002/api/v1';
    process.env.CONCIERGE_INTERNAL_API_KEY = 'test_s2s_key_2026';

    mockPrisma = {
      client: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    service = new ConciergeBridgeService(mockPrisma);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('rejects non-HTTPS or internal SSRF URLs in digitalMenuUrl (OWASP A03/A10)', async () => {
    await expect(
      service.syncClientConcierge('client-1', {
        enabled: true,
        digitalMenuUrl: 'http://localhost:8080/internal',
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.syncClientConcierge('client-1', {
        enabled: true,
        digitalMenuUrl: 'https://192.168.0.1/router',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('syncs client with Concierge microservice using X-Concierge-Internal-Key and saves metadata without storing plaintext passwords', async () => {
    mockPrisma.client.findUnique.mockResolvedValue({
      id: 'client-123',
      deliveryNome: 'Pizzaria Bella',
      segmento: 'Pizzaria',
      cidade: 'São Paulo',
      whatsapp: '5511999998888',
      conciergeTenantId: null,
    });

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tenant: { id: 'concierge-tenant-999' },
      }),
    });
    global.fetch = mockFetch as any;

    mockPrisma.client.update.mockImplementation(async ({ data }: any) => ({
      id: 'client-123',
      ...data,
    }));

    const res = await service.syncClientConcierge('client-123', {
      enabled: true,
      digitalMenuUrl: 'https://cardapio.anota.ai/pizzaria-bella',
      phoneNumberId: 'phone_999',
      metaAccessToken: 'EAAG_secret_meta_token',
      ownerEmail: 'dono@pizzariabella.com.br',
      ownerPassword: 'Password123!',
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [calledUrl, fetchOpts] = mockFetch.mock.calls[0];
    expect(calledUrl).toBe('http://localhost:3002/api/v1/internal/tenants/sync');
    expect(fetchOpts.headers['X-Concierge-Internal-Key']).toBe('test_s2s_key_2026');

    expect(res.aiConciergeEnabled).toBe(true);
    expect(res.conciergeTenantId).toBe('concierge-tenant-999');
    expect(res.serviceSynced).toBe(true);

    // Garante que nem metaAccessToken nem ownerPassword foram salvos na tabela clients do movy_db (OWASP A02)
    const prismaUpdateData = mockPrisma.client.update.mock.calls[0][0].data;
    expect(prismaUpdateData.metaAccessToken).toBeUndefined();
    expect(prismaUpdateData.ownerPassword).toBeUndefined();
  });

  it('returns all 5 AI metrics when microservice is online and degrades gracefully when microservice is offline (Fault Isolation)', async () => {
    mockPrisma.client.findUnique.mockResolvedValue({
      id: 'client-123',
      aiConciergeEnabled: true,
      conciergeTenantId: 'concierge-tenant-999',
      conciergeDigitalMenuUrl: 'https://cardapio.anota.ai/pizzaria-bella',
      conciergeOwnerEmail: 'dono@pizzariabella.com.br',
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tenantId: 'concierge-tenant-999',
        aiGlobalEnabled: true,
        hasMetaCredentials: true,
        knowledgeBase: {
          digitalMenuUrl: 'https://cardapio.anota.ai/pizzaria-bella',
          llmProvider: 'OPENAI',
          llmModel: 'gpt-4o-mini',
          estimatedDeliveryMinutes: 45,
          estimatedPickupMinutes: 20,
        },
        metrics: {
          totalConversations: 240,
          avgFirstResponseMs: 2800,
          menuLinkSentCount: 195,
          aiResolvedCount: 210,
          humanHandoffCount: 30,
          aiRetentionRatePercent: 88,
          promptTokens: 80000,
          completionTokens: 25000,
          totalTokens: 105000,
          estimatedCostUsd: 0.027,
        },
      }),
    }) as any;

    const onlineSummary = await service.getClientConciergeSummary('client-123');
    expect(onlineSummary.serviceAvailable).toBe(true);
    expect(onlineSummary.metrics?.totalConversations).toBe(240);
    expect(onlineSummary.metrics?.menuLinkSentCount).toBe(195);
    expect(onlineSummary.metrics?.aiRetentionRatePercent).toBe(88);

    // Simula queda do microserviço concierge-api
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as any;

    const degradedSummary = await service.getClientConciergeSummary('client-123');
    expect(degradedSummary.enabled).toBe(true);
    expect(degradedSummary.serviceAvailable).toBe(false);
    expect(degradedSummary.metrics?.totalConversations).toBe(0);
  });

  it('throws NotFoundException when client does not exist', async () => {
    mockPrisma.client.findUnique.mockResolvedValue(null);
    await expect(
      service.getClientConciergeSummary('non-existent'),
    ).rejects.toThrow(NotFoundException);
  });
});
