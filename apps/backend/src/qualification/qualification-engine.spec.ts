import { QualificationEngine, RawScores } from './qualification-engine';
import { LeadPriority, MeetingCondition, ForwardingAction } from '@prisma/client';

describe('QualificationEngine', () => {
  // ===================================================================
  // CENÁRIO 1: Nenhuma nota preenchida -> Não iniciado
  // ===================================================================
  it('deve retornar "Não iniciado" quando nenhuma nota estiver preenchida', () => {
    const scores: RawScores = {};
    const result = QualificationEngine.evaluate(scores);

    expect(result.validityStatus).toBe('Não iniciado');
    expect(result.totalScore).toBeNull();
    expect(result.priority).toBe(LeadPriority.INCOMPLETA);
    expect(result.meetingCondition).toBe(MeetingCondition.CONCLUIR_NOTAS);
    expect(result.forwardingAction).toBe(ForwardingAction.PREENCHER_FICHA);
  });

  // ===================================================================
  // CENÁRIO 2: Notas parciais -> Pendente
  // ===================================================================
  it('deve retornar "Pendente" quando menos de 6 notas estiverem preenchidas', () => {
    const scores: RawScores = {
      scorePerfil: 3,
      scoreCapacidadeOperacional: 2,
      scoreNecessidadeObjetivo: null,
      scoreCapacidadeInvestir: null,
      scoreAcessoDecisor: null,
      scoreMomentoContratacao: null,
    };
    const result = QualificationEngine.evaluate(scores);

    expect(result.validityStatus).toBe('Pendente');
    expect(result.totalScore).toBeNull();
    expect(result.priority).toBe(LeadPriority.INCOMPLETA);
    expect(result.forwardingAction).toBe(ForwardingAction.REVISAR_NOTAS);
  });

  // ===================================================================
  // CENÁRIO 3: Nota fora da faixa (> 3) -> Revisar notas
  // ===================================================================
  it('deve retornar "Revisar notas" quando alguma nota estiver fora de 0-3', () => {
    const scores: RawScores = {
      scorePerfil: 5,
      scoreCapacidadeOperacional: 2,
      scoreNecessidadeObjetivo: 3,
      scoreCapacidadeInvestir: 3,
      scoreAcessoDecisor: 3,
      scoreMomentoContratacao: 2,
    };
    const result = QualificationEngine.evaluate(scores);

    expect(result.validityStatus).toBe('Revisar notas');
    expect(result.totalScore).toBeNull();
    expect(result.priority).toBe(LeadPriority.INCOMPLETA);
  });

  // ===================================================================
  // CENÁRIO 4: Score máximo 18 com todos os mínimos -> Alta + Agendar
  // ===================================================================
  it('deve agendar com closer quando todos os critérios são 3 (pontuação 18)', () => {
    const scores: RawScores = {
      scorePerfil: 3,
      scoreCapacidadeOperacional: 3,
      scoreNecessidadeObjetivo: 3,
      scoreCapacidadeInvestir: 3,
      scoreAcessoDecisor: 3,
      scoreMomentoContratacao: 3,
    };
    const result = QualificationEngine.evaluate(scores);

    expect(result.validityStatus).toBe('Válidas');
    expect(result.totalScore).toBe(18);
    expect(result.priority).toBe(LeadPriority.ALTA);
    expect(result.meetingCondition).toBe(MeetingCondition.ATENDIDAS);
    expect(result.forwardingAction).toBe(ForwardingAction.AGENDAR_CLOSER);
    expect(result.unmetCriteria).toHaveLength(0);
  });

  // ===================================================================
  // CENÁRIO 5: Score 14 com mínimos atendidos -> Alta + Agendar
  // ===================================================================
  it('deve agendar com closer com score 14 e mínimos atendidos', () => {
    const scores: RawScores = {
      scorePerfil: 2,
      scoreCapacidadeOperacional: 2,
      scoreNecessidadeObjetivo: 2,
      scoreCapacidadeInvestir: 3,
      scoreAcessoDecisor: 3,
      scoreMomentoContratacao: 2,
    };
    const result = QualificationEngine.evaluate(scores);

    expect(result.totalScore).toBe(14);
    expect(result.priority).toBe(LeadPriority.ALTA);
    expect(result.meetingCondition).toBe(MeetingCondition.ATENDIDAS);
    expect(result.forwardingAction).toBe(ForwardingAction.AGENDAR_CLOSER);
  });

  // ===================================================================
  // CENÁRIO 6: REGRA DE OURO - Score 17 mas decisor = 2 -> NÃO agenda
  // ===================================================================
  it('NÃO deve agendar se decisor < 3 mesmo com score alto (17 pontos)', () => {
    const scores: RawScores = {
      scorePerfil: 3,
      scoreCapacidadeOperacional: 3,
      scoreNecessidadeObjetivo: 3,
      scoreCapacidadeInvestir: 3,
      scoreAcessoDecisor: 2, // Decisor NÃO confirmado
      scoreMomentoContratacao: 3,
    };
    const result = QualificationEngine.evaluate(scores);

    expect(result.totalScore).toBe(17);
    expect(result.priority).toBe(LeadPriority.ALTA);
    expect(result.meetingCondition).toBe(MeetingCondition.RESOLVER_CRITERIOS_MINIMOS);
    expect(result.forwardingAction).toBe(ForwardingAction.COMBINAR_RETORNO);
    expect(result.unmetCriteria.length).toBeGreaterThan(0);
    expect(result.unmetCriteria[0]).toContain('decisor');
  });

  // ===================================================================
  // CENÁRIO 7: Score 12 -> Em Desenvolvimento
  // ===================================================================
  it('deve classificar como "Em Desenvolvimento" com score entre 10 e 13', () => {
    const scores: RawScores = {
      scorePerfil: 2,
      scoreCapacidadeOperacional: 2,
      scoreNecessidadeObjetivo: 2,
      scoreCapacidadeInvestir: 2,
      scoreAcessoDecisor: 2,
      scoreMomentoContratacao: 2,
    };
    const result = QualificationEngine.evaluate(scores);

    expect(result.totalScore).toBe(12);
    expect(result.priority).toBe(LeadPriority.EM_DESENVOLVIMENTO);
    // Decisor = 2 (não é 3), então NÃO atende
    expect(result.meetingCondition).toBe(MeetingCondition.RESOLVER_CRITERIOS_MINIMOS);
    expect(result.forwardingAction).toBe(ForwardingAction.COMBINAR_RETORNO);
  });

  // ===================================================================
  // CENÁRIO 8: Score 5 -> Baixa Prontidão
  // ===================================================================
  it('deve classificar como "Baixa Prontidão" com score < 10', () => {
    const scores: RawScores = {
      scorePerfil: 1,
      scoreCapacidadeOperacional: 1,
      scoreNecessidadeObjetivo: 1,
      scoreCapacidadeInvestir: 1,
      scoreAcessoDecisor: 0,
      scoreMomentoContratacao: 1,
    };
    const result = QualificationEngine.evaluate(scores);

    expect(result.totalScore).toBe(5);
    expect(result.priority).toBe(LeadPriority.BAIXA_PRONTIDAO);
    expect(result.forwardingAction).toBe(ForwardingAction.COMBINAR_RETORNO);
  });

  // ===================================================================
  // CENÁRIO 9: Todos zero é válido (nota avaliada, não ausência)
  // ===================================================================
  it('deve aceitar nota 0 como avaliação válida (não pendente)', () => {
    const scores: RawScores = {
      scorePerfil: 0,
      scoreCapacidadeOperacional: 0,
      scoreNecessidadeObjetivo: 0,
      scoreCapacidadeInvestir: 0,
      scoreAcessoDecisor: 0,
      scoreMomentoContratacao: 0,
    };
    const result = QualificationEngine.evaluate(scores);

    expect(result.validityStatus).toBe('Válidas');
    expect(result.totalScore).toBe(0);
    expect(result.priority).toBe(LeadPriority.BAIXA_PRONTIDAO);
  });

  // ===================================================================
  // CENÁRIO 10: Limiar exato 10 pontos -> Em Desenvolvimento
  // ===================================================================
  it('deve classificar como "Em Desenvolvimento" com score exato de 10', () => {
    const scores: RawScores = {
      scorePerfil: 2,
      scoreCapacidadeOperacional: 2,
      scoreNecessidadeObjetivo: 1,
      scoreCapacidadeInvestir: 2,
      scoreAcessoDecisor: 1,
      scoreMomentoContratacao: 2,
    };
    const result = QualificationEngine.evaluate(scores);

    expect(result.totalScore).toBe(10);
    expect(result.priority).toBe(LeadPriority.EM_DESENVOLVIMENTO);
  });

  // ===================================================================
  // CENÁRIO 11: Limiar exato 9 pontos -> Baixa Prontidão
  // ===================================================================
  it('deve classificar como "Baixa Prontidão" com score exato de 9', () => {
    const scores: RawScores = {
      scorePerfil: 2,
      scoreCapacidadeOperacional: 2,
      scoreNecessidadeObjetivo: 1,
      scoreCapacidadeInvestir: 1,
      scoreAcessoDecisor: 1,
      scoreMomentoContratacao: 2,
    };
    const result = QualificationEngine.evaluate(scores);

    expect(result.totalScore).toBe(9);
    expect(result.priority).toBe(LeadPriority.BAIXA_PRONTIDAO);
  });

  // ===================================================================
  // CENÁRIO 12: Score alto com momento < 2 (> 90 dias) -> NÃO agenda
  // ===================================================================
  it('NÃO deve agendar quando momento de contratação < 2 (mais de 90 dias)', () => {
    const scores: RawScores = {
      scorePerfil: 3,
      scoreCapacidadeOperacional: 3,
      scoreNecessidadeObjetivo: 3,
      scoreCapacidadeInvestir: 3,
      scoreAcessoDecisor: 3,
      scoreMomentoContratacao: 1, // Mais de 90 dias
    };
    const result = QualificationEngine.evaluate(scores);

    expect(result.totalScore).toBe(16);
    expect(result.priority).toBe(LeadPriority.ALTA);
    expect(result.meetingCondition).toBe(MeetingCondition.RESOLVER_CRITERIOS_MINIMOS);
    expect(result.forwardingAction).toBe(ForwardingAction.COMBINAR_RETORNO);
    expect(result.unmetCriteria[0]).toContain('Momento');
  });

  // ===================================================================
  // CENÁRIO 13: Lista completa de critérios não atendidos
  // ===================================================================
  it('deve listar todos os critérios não atendidos quando nenhum mínimo é alcançado', () => {
    const scores: RawScores = {
      scorePerfil: 1,
      scoreCapacidadeOperacional: 1,
      scoreNecessidadeObjetivo: 1,
      scoreCapacidadeInvestir: 1,
      scoreAcessoDecisor: 1,
      scoreMomentoContratacao: 1,
    };
    const result = QualificationEngine.evaluate(scores);

    expect(result.totalScore).toBe(6);
    expect(result.unmetCriteria).toHaveLength(6);
    expect(result.forwardingAction).toBe(ForwardingAction.COMBINAR_RETORNO);
  });
});
