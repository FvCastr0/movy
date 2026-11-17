# Implementation Plan: Movy Agency Finance & Contracts (Módulo 2)

## Architecture & Dependency Flow
O módulo `agency-finance` implementa a gestão financeira e de contratos da Movy, conectando-se diretamente ao model `Client` existente e fornecendo uma rota autônoma `/finance` no frontend Next.js.

```
[PostgreSQL / Prisma]
       │
       ▼ (Model Contract: PlanCycle, PlanType, PaymentStatus, mrrEquivalent, mediaBudget)
[Backend: FinanceModule]
       ├── DTOs (CreateContractDto, UpdatePaymentStatusDto, FinanceMetricsResponseDto)
       ├── FinanceService (MRR contábil, receita do mês, LTV, cálculo de dias em atraso e COGS)
       └── FinanceController (GET /finance/metrics, GET /finance/contracts, PUT /contract, PATCH /status)
       │
       ▼ (REST API protegida por JWT)
[Frontend: /finance & /clients/[id]]
       ├── DashboardHeader (Link "Financeiro")
       ├── FinanceKpiCards (MRR Contábil, Receita do Mês, LTV, Inadimplência, Margem Bruta)
       ├── BillingTable (Tabela com semáforo de atraso, badges de plano e ações rápidas)
       ├── ContractModal (Edição com presets oficiais dos planos MOVY)
       └── ClientContractCard (Card integrado no detalhe do cliente /clients/[id])
```

## Implementation Phases & Order
1. **Fase 1: Schema Prisma & Banco de Dados**
   - Criação dos enums `PlanCycle`, `PlanType` e `PaymentStatus`.
   - Criação do model `Contract` com relacionamento 1:1 com `Client`.
   - Execução do `npx prisma db push` e `npx prisma generate`.
   - Auto-seed para contratos dos clientes ativos já existentes.

2. **Fase 2: Backend (FinanceModule & Regras de Negócio)**
   - Criação dos DTOs com validação `class-validator`.
   - Implementação do `FinanceService` com lógica contábil (MRR contábil, LTV agregado com setup, dias em atraso contra o `dueDay`).
   - Implementação do `FinanceController` e registro no `AppModule`.
   - Atualização do `ClientsService.convertLeadToClient` para gerar o contrato inicial com o plano selecionado.

3. **Fase 3: Testes Automatizados**
   - Testes unitários com Jest em `finance.service.spec.ts` validando os cálculos financeiros e detecção de inadimplência.

4. **Fase 4: Frontend (Tipagens & Componentes)**
   - Atualização das tipagens em `types/index.ts`.
   - Criação de `finance-kpi-cards.tsx`, `billing-table.tsx` e `contract-modal.tsx`.

5. **Fase 5: Frontend (Página `/finance` & Integração em `/clients/[id]`)**
   - Adição do link "Financeiro" no `dashboard-header.tsx`.
   - Construção da página `app/(dashboard)/finance/page.tsx`.
   - Integração do card de contrato na página de detalhes do cliente (`/clients/[id]`).

6. **Fase 6: Verificação & Graphify**
   - Build do backend e frontend.
   - Atualização do grafo no Graphify (`graphify update .`).

## Risk Analysis & Mitigations
- **Risco:** Clientes legados sem contrato causarem `null pointer` no dashboard.
  - *Mitigação:* `FinanceService` criará automaticamente contratos padrão nos clientes legados que não possuírem contrato registrado.
- **Risco:** Confusão entre receita de caixa do mês e MRR contábil no plano trimestral antecipado.
  - *Mitigação:* Exibir separadamente no painel o **MRR Contábil** (ex: R$ 1.500/mês) e a **Receita Realizada do Mês** (soma de faturas pagas + antecipações no mês).
