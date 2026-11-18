export interface MonthFinancialStatement {
  monthKey: string; // Ex: "2026-10"
  label: string;    // Ex: "Outubro 2026"
  revenue: {
    mrrRecognized: number;  // Competência
    cashInflow: number;     // Caixa
  };
  cogsClients: number;      // Custos diretos atrelados a contas de clientes
  expenses: {
    team: number;
    tools: number;
    marketing: number;
    others: number;
    total: number;
  };
  netProfitCompetence: number; // mrrRecognized - cogsClients - expenses.total
  netProfitCash: number;       // cashInflow - cogsClients - expenses.total
  netMarginPercent: number;    // (netProfitCompetence / mrrRecognized) * 100
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
