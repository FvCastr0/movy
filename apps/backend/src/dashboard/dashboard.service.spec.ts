import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: PrismaService;
  let configService: ConfigService;

  const mockPrisma = {
    contract: {
      findMany: jest.fn(),
    },
    client: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    lead: {
      findMany: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'AGENCY_META_ACCOUNT_ID') return 'act_agency_movy';
      if (key === 'AGENCY_META_ACCESS_TOKEN') return 'token_agency_movy';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    prisma = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return aggregated overview with lead inflow and agency meta', async () => {
    const mockNow = new Date();
    const tenDaysAhead = new Date();
    tenDaysAhead.setDate(mockNow.getDate() + 10);

    // Mock contracts
    mockPrisma.contract.findMany
      .mockResolvedValueOnce([
        {
          id: 'c1',
          mrrEquivalent: 2000,
          totalValue: 6000,
          endDate: tenDaysAhead,
          paymentStatus: 'EM_DIA',
          clientId: 'cl-1',
          client: { id: 'cl-1', deliveryNome: 'Pizzaria Bella' },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'c1',
          endDate: tenDaysAhead,
          client: { id: 'cl-1', deliveryNome: 'Pizzaria Bella' },
        },
      ]);

    // Mock client counts
    mockPrisma.client.count
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);

    // Mock leads com datas
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(mockNow.getDate() - 2);

    mockPrisma.lead.findMany.mockResolvedValueOnce([
      { id: 'l1', stage: 'NOVO', dealValue: 1500, createdAt: mockNow, origemTipo: 'INBOUND' },
      { id: 'l2', stage: 'FECHADO', dealValue: 2000, createdAt: twoDaysAgo, origemTipo: 'INBOUND' },
      { id: 'l3', stage: 'PERDIDO', dealValue: 3000, createdAt: twoDaysAgo, origemTipo: 'OUTBOUND' },
    ]);

    // Mock clients with reports
    mockPrisma.client.findMany.mockResolvedValueOnce([
      {
        id: 'cl-1',
        deliveryNome: 'Pizzaria Bella',
        createdAt: new Date('2025-06-01'),
        metaAdAccountId: 'act_123',
        metaAccessTokenEnc: 'enc_tok',
        weeklyReports: [
          {
            weekEndDate: mockNow,
            metaSpend: 500,
            metaConversas: 60,
            metaRoas: 4.2,
          },
        ],
        adAccountMetrics: [],
        alerts: [],
      },
    ]);

    const result = await service.getOverview('month', 14);

    // Validações Lead Inflow
    expect(result.commercial.leadInflow.length).toBe(14);
    expect(result.commercial.inflowTotal).toBe(3);
    expect(result.commercial.inflowAverageDaily).toBeGreaterThan(0);

    // Validações Meta Ads dos Clientes
    expect(result.clientMetaAggregate.period).toBe('month');
    expect(result.clientMetaAggregate.totalSpend).toBe(500);
    expect(result.clientMetaAggregate.totalChats).toBe(60);
    expect(result.clientMetaAggregate.sinceDate).toBe('2025-06-01');

    // Validações Meta Ads da Agência MOVY
    expect(result.agencyMeta.configured).toBe(true);
    expect(result.agencyMeta.adAccountId).toBe('act_agency_movy');
    expect(result.agencyMeta.leadsGenerated).toBe(2); // 2 Inbound
    expect(result.agencyMeta.costPerLead).toBe(750); // 1500 / 2
  });

  it('should aggregate all weekly reports when clientPeriod is all_time', async () => {
    mockPrisma.contract.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    mockPrisma.client.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    mockPrisma.lead.findMany.mockResolvedValueOnce([]);

    mockPrisma.client.findMany.mockResolvedValueOnce([
      {
        id: 'cl-1',
        deliveryNome: 'Pizzaria Bella',
        createdAt: new Date('2025-01-01'),
        metaAdAccountId: 'act_123',
        metaAccessTokenEnc: 'enc_tok',
        weeklyReports: [
          { weekEndDate: new Date(), metaSpend: 500, metaConversas: 50, metaRoas: 4.0 },
          { weekEndDate: new Date(), metaSpend: 600, metaConversas: 60, metaRoas: 5.0 },
        ],
        adAccountMetrics: [],
        alerts: [],
      },
    ]);

    const result = await service.getOverview('all_time', 30);

    expect(result.clientMetaAggregate.period).toBe('all_time');
    expect(result.clientMetaAggregate.totalSpend).toBe(1100);
    expect(result.clientMetaAggregate.totalChats).toBe(110);
    expect(result.clientMetaAggregate.averageRoas).toBe(4.5);
    expect(result.commercial.leadInflow.length).toBe(30);
  });

  it('should support 90 and 180 days for lead inflow', async () => {
    mockPrisma.contract.findMany.mockResolvedValue([]).mockResolvedValue([]);
    mockPrisma.client.count.mockResolvedValue(0);
    mockPrisma.lead.findMany.mockResolvedValue([]);
    mockPrisma.client.findMany.mockResolvedValue([]);

    const result90 = await service.getOverview('month', 90);
    expect(result90.commercial.leadInflow.length).toBe(90);

    const result180 = await service.getOverview('month', 180);
    expect(result180.commercial.leadInflow.length).toBe(180);
  });
});
