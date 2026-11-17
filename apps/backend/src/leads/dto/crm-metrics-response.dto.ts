export interface CrmMetricsResponseDto {
  totalLeads: number;
  totalInbound: number;
  totalOutbound: number;
  bookingRate: number;      // Taxa de Agendamento (%)
  noShowRate: number;       // Taxa de No-Show (%)
  winRate: number;          // Taxa de Fechamento (%)
  totalPipelineValue: number; // Soma de propostas abertas
  closedRevenueValue: number; // Soma de contratos fechados
  stageCounts: Record<string, number>;
}
