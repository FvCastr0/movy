# Tasks: CRM Event-Driven Metrics & Stage Undo

- [x] Task 1: Modelagem Prisma e Migração da Tabela `LeadStageHistory`
  - Acceptance: Schema do Prisma atualizado com `model LeadStageHistory` contendo `id`, `leadId`, `fromStage`, `toStage`, `reason`, `isReverted`, `revertedAt`, `userId`, `createdAt`, índices de performance e relação no `Lead`. Migração executada e Prisma Client gerado com sucesso.
  - Verify: Banco sincronizado (`npx prisma db push`) e `@prisma/client` exporta `LeadStageHistory`. Compilação do backend com sucesso.
  - Files: `apps/backend/prisma/schema.prisma`

- [x] Task 2: Backend Core - Histórico de Estágios, Endpoint de Desfazer (Undo) e Cálculo Temporal de Métricas
  - Acceptance: `LeadsService.updateCrmStage` encapsulado em transação Prisma gerando histórico. Método `undoLastStage` implementado em `LeadsService` e exposto em `POST /leads/:id/crm-stage/undo`. Método `getCrmMetrics` atualizado para receber query params (`startDate`, `endDate`, `origemTipo`) e computar `agendadosCount`, `noShowCount`, `bookingRate` e `noShowRate` a partir dos eventos válidos (`isReverted: false`) de `LeadStageHistory`.
  - Verify: Testes unitários Jest em `apps/backend/src/leads/leads.service.spec.ts` validando transição, undo e filtro de datas executando com 100% de aprovação.
  - Files: `apps/backend/src/leads/dto/crm-metrics-query.dto.ts`, `apps/backend/src/leads/leads.service.ts`, `apps/backend/src/leads/leads.controller.ts`, `apps/backend/src/leads/leads.service.spec.ts`

- [x] Task 3: Tipagem e Componente de Filtro de Datas no Frontend
  - Acceptance: Arquivo `apps/frontend/src/types/index.ts` atualizado com interfaces de query e resposta de métricas. Componente `CrmDateFilter` criado com presets (*Geral*, *Hoje*, *Últimos 7 dias*, *Este Mês*, *Mês Anterior*, *Customizado*) com cálculo limpo de ISO strings para início e fim de intervalo.
  - Verify: Arquivo compila sem erros de TypeScript (`npx tsc --noEmit`).
  - Files: `apps/frontend/src/types/index.ts`, `apps/frontend/src/components/crm/crm-date-filter.tsx`

- [x] Task 4: Toast Flutuante de Desfazer e Integração no Pipeline do CRM
  - Acceptance: Componente `StageUndoToast` implementado com barra de progresso animada (8s) e ação de clique "Desfazer". Página `apps/frontend/src/app/(dashboard)/crm/page.tsx` integrada: ao arrastar card ou mudar estágio, o toast é disparado; ao clicar em desfazer, o backend é acionado (`POST /leads/:id/crm-stage/undo`), o card retorna para a coluna anterior e as métricas são sincronizadas.
  - Verify: Simulação de transição e clique no botão Desfazer com reversão confirmada no estado local e atualização de cards KPI.
  - Files: `apps/frontend/src/components/crm/stage-undo-toast.tsx`, `apps/frontend/src/app/(dashboard)/crm/page.tsx`, `apps/frontend/src/components/crm/crm-kpi-cards.tsx`

- [x] Task 5: Integração de Filtro Temporal e Métricas na Visão Geral do Cockpit
  - Acceptance: `apps/frontend/src/app/(dashboard)/page.tsx` e `commercial-funnel-widget.tsx` atualizados para consumir métricas do novo motor de eventos, refletindo as taxas reais e respeitando filtros de data na home.
  - Verify: Acesso e renderização da página `/` sem quebras ou discrepâncias visuais.
  - Files: `apps/frontend/src/app/(dashboard)/page.tsx`, `apps/frontend/src/components/dashboard/commercial-funnel-widget.tsx`

- [x] Task 6: Validação de Build Geral e Integridade de Código
  - Acceptance: Builds completos de produção do backend e frontend executados com código 0. Nenhum arquivo fora do escopo alterado.
  - Verify: `cd apps/backend && npm run build` e `cd apps/frontend && npm run build` finalizados sem erros.
  - Files: `tasks/todo.md`
