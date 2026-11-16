export type LeadStage =
  | 'NOVO'
  | 'PRE_QUALIFICADO'
  | 'CONTATO_INICIADO'
  | 'REUNIAO_AGENDADA'
  | 'PROPOSTA_ENVIADA'
  | 'GANHO'
  | 'PERDIDO'
  | 'DESQUALIFICADO';

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
}
