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

export type LeadOriginType = 'INBOUND' | 'OUTBOUND';

export interface CrmMetrics {
  totalLeads: number;
  totalInbound: number;
  totalOutbound: number;
  bookingRate: number;
  noShowRate: number;
  winRate: number;
  totalPipelineValue: number;
  closedRevenueValue: number;
  stageCounts: Record<string, number>;
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
  userId: string;
  content: string;
  stageAtMoment: LeadStage;
  createdAt: string;
  user?: {
    id: string;
    name: string;
  };
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
  createdAt: string;
  updatedAt: string;
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

