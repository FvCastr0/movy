export type LeadStage =
  | 'NOVO'
  | 'PRE_QUALIFICADO'
  | 'CONTATO_INICIADO'
  | 'REUNIAO_AGENDADA'
  | 'NO_SHOW'
  | 'PROPOSTA_ENVIADA'
  | 'FECHADO'
  | 'GANHO'
  | 'PERDIDO'
  | 'DESQUALIFICADO';

export type UserRole = 'ADMIN' | 'SDR' | 'CLOSER' | 'GESTOR';

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt?: string;
}

export type LeadOriginType = 'INBOUND' | 'OUTBOUND';

export interface CrmMetrics {
  totalLeads: number;
  totalInbound: number;
  totalOutbound: number;
  agendadosCount?: number;
  noShowCount?: number;
  fechadosCount?: number;
  reunioesRealizadasCount?: number;
  bookingRate: number;
  noShowRate: number;
  winRate: number;
  totalPipelineValue: number;
  closedRevenueValue: number;
  stageCounts: Record<string, number>;
}

export type CrmDatePreset = 'ALL' | 'TODAY' | '7D' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM';

export interface CrmDateRange {
  preset: CrmDatePreset;
  startDate?: string;
  endDate?: string;
  label: string;
}

export interface LeadStageHistory {
  id: string;
  leadId: string;
  fromStage?: LeadStage | null;
  toStage: LeadStage;
  reason?: string | null;
  isReverted: boolean;
  revertedAt?: string | null;
  userId?: string | null;
  createdAt: string;
}

export type LeadPriority = 'ALTA' | 'EM_DESENVOLVIMENTO' | 'BAIXA_PRONTIDAO' | 'INCOMPLETA';

export type MeetingCondition = 'ATENDIDAS' | 'RESOLVER_CRITERIOS_MINIMOS' | 'CONCLUIR_NOTAS';

export type ForwardingAction = 'AGENDAR_CLOSER' | 'COMBINAR_RETORNO' | 'REVISAR_NOTAS' | 'PREENCHER_FICHA';

export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED';

export interface LeadQualification {
  id: string;
  leadId: string;
  scorePerfil: number | null;
  justificativaPerfil: string | null;
  scoreCapacidadeOperacional: number | null;
  justificativaOperacional: string | null;
  scoreNecessidadeObjetivo: number | null;
  justificativaNecessidade: string | null;
  scoreCapacidadeInvestir: number | null;
  justificativaInvestir: string | null;
  scoreAcessoDecisor: number | null;
  justificativaDecisor: string | null;
  scoreMomentoContratacao: number | null;
  justificativaMomento: string | null;
  totalScore: number | null;
  priority: LeadPriority | null;
  meetingCondition: MeetingCondition | null;
  forwardingAction: ForwardingAction | null;
  pendenciasCloser: string | null;
  proximaAcao: string | null;
  dataProximoContato: string | null;
  updatedAt: string;
}

export interface LeadFollowUp {
  id: string;
  leadId: string;
  userId?: string | null;
  notes: string;
  content?: string;
  stageAtMoment?: LeadStage;
  scheduledAt?: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
  } | null;
}

export interface Lead {
  id: string;
  nome: string;
  whatsapp: string;
  deliveryNome: string;
  segmento: string;
  cidade: string;
  origem: string;
  origemTipo?: LeadOriginType;
  dealValue?: number | null;
  meetingDate?: string | null;
  lostReason?: string | null;
  stage: LeadStage;
  notificationStatus: NotificationStatus;
  notificationError?: string | null;
  createdAt: string;
  updatedAt: string;
  qualification?: LeadQualification | null;
  sdrResponsible?: {
    id: string;
    name: string;
    email: string;
    role?: UserRole;
  } | null;
  closerResponsibleId?: string | null;
  closerResponsible?: {
    id: string;
    name: string;
    email: string;
    role?: UserRole;
  } | null;
  followUps?: LeadFollowUp[];
  client?: {
    id: string;
    status: string;
  } | null;
}

export type ClientStatus = 'ATIVO' | 'PAUSADO' | 'CANCELADO';

export interface WeeklyReport {
  id: string;
  clientId: string;
  weekStartDate: string;
  weekEndDate: string;
  metaSpend: number;
  metaImpressions: number;
  metaClicks: number;
  metaCtr: number;
  metaCpc: number;
  metaConversas: number;
  metaCostPerChat: number;
  metaRoas?: number | null;
  metaCpr?: number | null;
  faturamentoTotal?: number | null;
  pedidosTotais?: number | null;
  analiseGestor?: string | null;
  proximasAcoes?: string | null;
  pdfUrl?: string | null;
  whatsappSent: boolean;
  whatsappSentAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  nome: string;
  deliveryNome: string;
  whatsapp: string;
  segmento: string;
  cidade: string;
  status: ClientStatus;
  convertedLeadId?: string | null;
  metaAdAccountId?: string | null;
  metaPixelId?: string | null;
  accountManagerId?: string | null;
  accountManager?: {
    id: string;
    name: string;
    email: string;
  } | null;
  contract?: Contract | null;
  weeklyReports?: WeeklyReport[];

  // Onboarding & Performance
  onboardingStage?: OnboardingStage;
  onboardingStageUpdatedAt?: string;
  metaAccessGranted?: boolean;
  pageAccessGranted?: boolean;
  instagramAccessGranted?: boolean;
  pixelCreated?: boolean;
  videosReceived?: boolean;
  creativesApproved?: boolean;
  hoursInStage?: number;
  isDelayed?: boolean;

  // Credenciais Meta Ads (Segurança & Expiração)
  metaTokenStatus?: 'NOT_CONFIGURED' | 'ACTIVE' | 'EXPIRED' | 'INVALID';
  metaTokenExpiresAt?: string | null;
  metaLastSyncAt?: string | null;

  // Integração AI Concierge (WhatsApp Delivery)
  aiConciergeEnabled?: boolean;
  conciergeTenantId?: string | null;
  conciergeDigitalMenuUrl?: string | null;
  conciergeOwnerEmail?: string | null;
  conciergeLastSyncedAt?: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface ConciergeMetricsSummary {
  totalConversations: number;
  avgFirstResponseMs: number;
  menuLinkSentCount: number;
  aiResolvedCount: number;
  humanHandoffCount: number;
  aiRetentionRatePercent: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export interface ClientConciergeSummary {
  clientId: string;
  enabled: boolean;
  provisioned: boolean;
  serviceAvailable: boolean;
  tenantId?: string | null;
  aiGlobalEnabled: boolean;
  hasMetaCredentials: boolean;
  wabaId?: string | null;
  phoneNumberId?: string | null;
  digitalMenuUrl?: string | null;
  ownerEmail?: string | null;
  lastSyncedAt?: string | null;
  knowledgeBase?: {
    digitalMenuUrl: string;
    llmProvider: 'OPENAI' | 'GEMINI';
    llmModel: string;
    estimatedDeliveryMinutes: number;
    estimatedPickupMinutes: number;
  } | null;
  metrics: ConciergeMetricsSummary | null;
}

export interface SyncClientConciergeInput {
  enabled: boolean;
  digitalMenuUrl?: string;
  wabaId?: string;
  phoneNumberId?: string;
  metaAccessToken?: string;
  webhookVerifyToken?: string;
  ownerEmail?: string;
  ownerName?: string;
  ownerPassword?: string;
}

export type PlanCycle = 'MENSAL' | 'TRIMESTRAL';

export type PlanType =
  | 'TRIMESTRAL_REUNIAO'
  | 'TRIMESTRAL_NORMAL'
  | 'MENSAL_REUNIAO'
  | 'MENSAL_NORMAL'
  | 'PERSONALIZADO';

export type PaymentStatus = 'EM_DIA' | 'PENDENTE' | 'INADIMPLENTE';

export interface Contract {
  id: string;
  clientId: string;
  cycle: PlanCycle;
  planType: PlanType;
  totalValue: number;
  mrrEquivalent: number;
  setupValue: number;
  mediaBudget: number;
  operationalCost: number;
  dueDay: number;
  paymentStatus: PaymentStatus;
  startDate: string;
  endDate?: string | null;
  churnReason?: string | null;
  notes?: string | null;
  daysOverdue?: number;
  isAtRisk?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceMetrics {
  mrrTotal: number;
  receitaMesAtual: number;
  ticketMedio: number;
  clientesAtivosCount: number;
  cogsTotal: number;
  margemBrutaPercent: number;
  ltvMedio: number;
  totalInadimplenteValor: number;
  totalInadimplenteClientes: number;
  churnRatePercent: number;
}

export type OnboardingStage =
  | 'BRIEFING_PREENCHIDO'
  | 'ACESSOS_LIBERADOS'
  | 'CRIATIVOS_APROVADOS'
  | 'CAMPANHAS_NO_AR'
  | 'CONCLUIDO';

export interface RiskStatus {
  clientId: string;
  deliveryNome: string;
  currentBalance: number;
  avgDailySpend: number;
  weekendSpendRequired: number;
  isLowBalance: boolean;
  cpaRecent: number;
  cpaBaseline: number;
  cpaDiffPercent: number;
  isCpaSpike: boolean;
  hasMetrics: boolean;
  recentMetrics: {
    date: string;
    spend: number;
    balance: number;
    conversas: number;
    cpa: number;
  }[];
}

export interface ClientRevenueReport {
  id: string;
  clientId: string;
  periodStart: string;
  periodEnd: string;
  grossRevenue: number;
  ordersCount: number;
  source: string;
  filename?: string | null;
  createdAt: string;
}

export interface RevenueReportResponse {
  success: boolean;
  report: ClientRevenueReport;
  grossRevenue: number;
  ordersCount: number;
  ticketMedioPedidos: number;
}

export interface MetaCredentialsStatus {
  clientId: string;
  deliveryNome: string;
  metaAdAccountId?: string | null;
  hasToken: boolean;
  status: 'NOT_CONFIGURED' | 'ACTIVE' | 'EXPIRED' | 'INVALID';
  createdAt?: string | null;
  expiresAt?: string | null;
  daysRemaining: number;
  isNearExpiry: boolean;
  isExpired: boolean;
  lastSyncAt?: string | null;
}

export interface MetaAccountInsights {
  clientId: string;
  deliveryNome: string;
  adAccountId: string;
  periodStart: string;
  periodEnd: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversas: number;
  cpa: number;
  cpr?: number;
  roas?: number;
  cached: boolean;
  cachedAt?: string;
  cacheExpiresInSeconds?: number;
  cooldownWarning?: string;
}

export interface SaveMetaConfigInput {
  metaAdAccountId: string;
  accessToken: string;
}

export type LeadPeriodDays = 14 | 30 | 90 | 180;

export interface LeadInflowItem {
  date: string;       // YYYY-MM-DD
  label: string;      // DD/MM
  dayOfWeek: string;  // Seg, Ter, Qua...
  count: number;
}

export interface DashboardOverview {
  financial: {
    totalMrr: number;
    activeContracts: number;
    averageTicket: number;
    renewalsNext30Days: number;
    delinquentCount: number;
  };
  commercial: {
    totalLeads: number;
    pipelineValue: number;
    conversionRate: number;
    bookingRate?: number;
    noShowRate?: number;
    agendadosCount?: number;
    noShowCount?: number;
    leadsByStage: Record<string, number>;
    leadInflow: LeadInflowItem[];
    inflowTotal: number;
    inflowAverageDaily: number;
    peakDay: { date: string; count: number } | null;
  };
  operations: {
    activeClients: number;
    pausedClients: number;
    churnedClients: number;
    pendingWeeklyReports: number;
  };
  clientMetaAggregate: {
    period: 'month' | 'all_time';
    totalSpend: number;
    totalChats: number;
    averageCpr: number;
    averageRoas: number;
    activeAdAccounts: number;
    sinceDate?: string | null;
  };
  agencyMeta: {
    configured: boolean;
    adAccountId?: string | null;
    spend: number;
    leadsGenerated: number;
    costPerLead: number;
    impressions: number;
    clicks: number;
    status: 'ACTIVE' | 'NOT_CONFIGURED';
  };
  recentAlerts: Array<{
    id: string;
    type: 'critical' | 'warning' | 'info';
    category: 'balance' | 'contract' | 'report';
    title: string;
    description: string;
    clientId?: string;
    clientName?: string;
    createdAt: string;
  }>;
}

export type ExpenseCategory = 'EQUIPE' | 'FERRAMENTAS_SAAS' | 'MARKETING_PROPRIO' | 'OUTROS';

export interface Expense {
  id: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  dueDate: string;
  isRecurring: boolean;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseInput {
  description: string;
  category: ExpenseCategory;
  amount: number;
  dueDate: string;
  isRecurring?: boolean;
  notes?: string;
}

export interface MonthFinancialStatement {
  monthKey: string;
  label: string;
  revenue: {
    mrrRecognized: number;
    cashInflow: number;
  };
  cogsClients: number;
  expenses: {
    team: number;
    tools: number;
    marketing: number;
    others: number;
    total: number;
  };
  netProfitCompetence: number;
  netProfitCash: number;
  netMarginPercent: number;
}

export interface MonthlyClosingSummary {
  periods: MonthFinancialStatement[];
  totals: {
    totalRevenueCompetence: number;
    totalRevenueCash: number;
    totalExpenses: number;
    totalNetProfitCompetence: number;
    totalNetProfitCash: number;
    averageMarginPercent: number;
  };
}



