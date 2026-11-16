import {
  LeadPriority,
  MeetingCondition,
  ForwardingAction,
} from '@prisma/client';

export interface RawScores {
  scorePerfil?: number | null;
  scoreCapacidadeOperacional?: number | null;
  scoreNecessidadeObjetivo?: number | null;
  scoreCapacidadeInvestir?: number | null;
  scoreAcessoDecisor?: number | null;
  scoreMomentoContratacao?: number | null;
}

export type ValidityStatus = 'Não iniciado' | 'Pendente' | 'Válidas' | 'Revisar notas';

export interface QualificationResult {
  validityStatus: ValidityStatus;
  totalScore: number | null;
  priority: LeadPriority;
  meetingCondition: MeetingCondition;
  forwardingAction: ForwardingAction;
  unmetCriteria: string[];
}

export class QualificationEngine {
  /**
   * Avalia as 6 notas do SDR conforme a lógica oficial de MOVY-Qualificacao-SDR.xlsx
   */
  static evaluate(scores: RawScores): QualificationResult {
    const scoreList = [
      scores.scorePerfil,
      scores.scoreCapacidadeOperacional,
      scores.scoreNecessidadeObjetivo,
      scores.scoreCapacidadeInvestir,
      scores.scoreAcessoDecisor,
      scores.scoreMomentoContratacao,
    ];

    const filledScores = scoreList.filter(
      (s) => s !== null && s !== undefined && typeof s === 'number' && !isNaN(s),
    );

    // 1. Validade das notas
    let validityStatus: ValidityStatus;
    if (filledScores.length === 0) {
      validityStatus = 'Não iniciado';
    } else if (filledScores.length < 6) {
      validityStatus = 'Pendente';
    } else {
      const allIntegersAndInRange = scoreList.every(
        (s) => typeof s === 'number' && Number.isInteger(s) && s >= 0 && s <= 3,
      );
      validityStatus = allIntegersAndInRange ? 'Válidas' : 'Revisar notas';
    }

    // Se as notas não forem estritamente válidas
    if (validityStatus !== 'Válidas') {
      return {
        validityStatus,
        totalScore: null,
        priority: LeadPriority.INCOMPLETA,
        meetingCondition: MeetingCondition.CONCLUIR_NOTAS,
        forwardingAction:
          validityStatus === 'Não iniciado'
            ? ForwardingAction.PREENCHER_FICHA
            : ForwardingAction.REVISAR_NOTAS,
        unmetCriteria: ['Qualificação incompleta. Todas as 6 notas devem ser atribuídas de 0 a 3.'],
      };
    }

    // 2. Pontuação Total (0 a 18)
    const p = scores.scorePerfil!;
    const op = scores.scoreCapacidadeOperacional!;
    const nec = scores.scoreNecessidadeObjetivo!;
    const inv = scores.scoreCapacidadeInvestir!;
    const dec = scores.scoreAcessoDecisor!;
    const mom = scores.scoreMomentoContratacao!;

    const totalScore = p + op + nec + inv + dec + mom;

    // 3. Prioridade pela soma
    let priority: LeadPriority;
    if (totalScore >= 14) {
      priority = LeadPriority.ALTA;
    } else if (totalScore >= 10) {
      priority = LeadPriority.EM_DESENVOLVIMENTO;
    } else {
      priority = LeadPriority.BAIXA_PRONTIDAO;
    }

    // 4. Critérios Mínimos Obrigatórios para Reunião com Closer
    const unmetCriteria: string[] = [];

    if (p < 2) {
      unmetCriteria.push('Perfil do negócio menor que 2 (deve estar em implantação estruturada ou já operando).');
    }
    if (op < 2) {
      unmetCriteria.push('Capacidade operacional menor que 2 (cozinha e equipe com gargalos sem solução planejada).');
    }
    if (nec < 2) {
      unmetCriteria.push('Necessidade e objetivo menor que 2 (não identifica problema concreto ou prioridade clara).');
    }
    if (inv < 2) {
      unmetCriteria.push('Capacidade de investir menor que 2 (sem recursos previstos para assessoria e anúncios).');
    }
    if (dec !== 3) {
      unmetCriteria.push('Acesso ao decisor diferente de 3 (decisor e demais aprovadores devem estar confirmados na reunião).');
    }
    if (mom < 2) {
      unmetCriteria.push('Momento de contratação menor que 2 (início pretendido deve ser em até 90 dias).');
    }

    const meetingCondition =
      unmetCriteria.length === 0
        ? MeetingCondition.ATENDIDAS
        : MeetingCondition.RESOLVER_CRITERIOS_MINIMOS;

    // 5. Encaminhamento
    const forwardingAction =
      meetingCondition === MeetingCondition.ATENDIDAS
        ? ForwardingAction.AGENDAR_CLOSER
        : ForwardingAction.COMBINAR_RETORNO;

    return {
      validityStatus,
      totalScore,
      priority,
      meetingCondition,
      forwardingAction,
      unmetCriteria,
    };
  }
}
