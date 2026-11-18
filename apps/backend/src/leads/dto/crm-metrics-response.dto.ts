export interface CrmMetricsResponseDto {
  totalLeads: number;
  totalInbound: number;
  totalOutbound: number;
  agendadosCount: number;         // Total de reuniões agendadas no período (eventos não revertidos)
  noShowCount: number;            // Total de faltas no-show no período (eventos não revertidos)
  fechadosCount: number;          // Total de contratos fechados no período
  reunioesRealizadasCount: number;// Reuniões que evoluíram para proposta/fechamento
  bookingRate: number;            // Taxa de Agendamento (%)
  noShowRate: number;             // Taxa de No-Show (%)
  winRate: number;                // Taxa de Fechamento (%)
  totalPipelineValue: number;     // Soma de propostas abertas
  closedRevenueValue: number;     // Soma de contratos fechados
  stageCounts: Record<string, number>;
}
