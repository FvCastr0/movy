# Tasks: Movy Agency Finance & Contracts (Módulo 2)

- [x] Task 1: Schema Prisma e Migração da Entidade Contract
  - Acceptance: Enums `PlanCycle`, `PlanType`, `PaymentStatus` e model `Contract` adicionados ao schema.prisma. Relação 1:1 com `Client`. Prisma Client e banco sincronizados.
  - Verify: `npx prisma db push` e `npx prisma generate` executados com sucesso.
  - Files: `apps/backend/prisma/schema.prisma`

- [x] Task 2: DTOs e Módulo de Finanças no Backend
  - Acceptance: DTOs `CreateContractDto`, `UpdatePaymentStatusDto` e `FinanceMetricsResponseDto` criados com validação estrita.
  - Verify: Arquivos compilam sem erros TypeScript no backend.
  - Files: `apps/backend/src/finance/dto/create-contract.dto.ts`, `apps/backend/src/finance/dto/update-payment-status.dto.ts`, `apps/backend/src/finance/dto/finance-metrics-response.dto.ts`

- [x] Task 3: Lógica de Negócio e Endpoints em FinanceService & FinanceController
  - Acceptance: `FinanceService` implementa cálculo de MRR contábil, receita do mês, LTV acumulado, controle de dias de atraso e CRUD de contratos. `FinanceController` expõe endpoints protegidos por JWT. `FinanceModule` registrado no `AppModule`.
  - Verify: Chamadas aos endpoints respondem com status 200/201 e dados consolidados.
  - Files: `apps/backend/src/finance/finance.service.ts`, `apps/backend/src/finance/finance.controller.ts`, `apps/backend/src/finance/finance.module.ts`, `apps/backend/src/app.module.ts`

- [x] Task 4: Testes Unitários de Backend
  - Acceptance: Testes unitários com Jest cobrem o cálculo do MRR, composição do LTV, cálculo de dias de atraso contra o `dueDay` e margem bruta com COGS.
  - Verify: `npm test` passa com 100% dos testes de `finance.service.spec.ts` em verde.
  - Files: `apps/backend/src/finance/finance.service.spec.ts`

- [x] Task 5: Tipagens TypeScript e Navegação no Frontend
  - Acceptance: Tipos `PlanCycle`, `PlanType`, `PaymentStatus`, `Contract`, `FinanceMetrics` exportados em `types/index.ts`. Link "Financeiro" (`/finance`) adicionado no `DashboardHeader`.
  - Verify: `npm run lint` / compilação do frontend sem erros.
  - Files: `apps/frontend/src/types/index.ts`, `apps/frontend/src/components/layout/dashboard-header.tsx`

- [x] Task 6: Componentes Financeiros
  - Acceptance: Componentes `FinanceKpiCards` (5 cards executivos), `BillingTable` (tabela de cobrança com semáforo de atraso e badges de plano), e `ContractModal` (modal com presets dos planos oficiais Movy) criados e estilizados no padrão visual Movy.
  - Verify: Componentes renderizam sem quebras e interagem com modais de forma fluida.
  - Files: `apps/frontend/src/components/finance/finance-kpi-cards.tsx`, `apps/frontend/src/components/finance/billing-table.tsx`, `apps/frontend/src/components/finance/contract-modal.tsx`

- [x] Task 7: Página do Dashboard `/finance` e Integração em Detalhes do Cliente
  - Acceptance: Rota `app/(dashboard)/finance/page.tsx` integra KPIs, filtros de cobrança, busca, e modal de contrato. Card de contrato financeiro integrado na página de detalhes do cliente (`/clients/[id]`).
  - Verify: `npm run build` em `apps/frontend` passa sem nenhum erro de build ou tipagem.
  - Files: `apps/frontend/src/app/(dashboard)/finance/page.tsx`, `apps/frontend/src/app/(dashboard)/clients/[id]/page.tsx`
