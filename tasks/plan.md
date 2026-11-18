# Technical Implementation Plan: CRM Event-Driven Metrics & Stage Undo

## Context & Objectives
Implementar a arquitetura baseada em eventos para o CRM Comercial do MOVY, resolvendo a perda de métricas ao mover leads entre estágios. Adicionar tabela de histórico (`LeadStageHistory`), cálculo temporal de taxas (No-Show e Agendamentos), suporte a filtros por período (Geral por padrão) e mecanismo de **Desfazer (Undo)** via Toast Flutuante na interface.

---

## 1. Arquitetura de Componentes & Dependências

```
PostgreSQL / Prisma
  └── LeadStageHistory (model com leadId, fromStage, toStage, reason, isReverted, createdAt)
        ▲
        ├── Backend: LeadsService (Prisma Transaction para update de estágio + gravação de histórico)
        ├── Backend: LeadsService (undoLastStage: busca última transição ativa, marca revertida, restaura estágio anterior)
        ├── Backend: LeadsService (getCrmMetrics: cálculo baseado em eventos históricos com filtros de data)
        ├── Backend: LeadsController (POST /leads/:id/crm-stage/undo & GET /leads/crm-metrics?startDate=&endDate=&origemTipo=)
        └── Backend: DashboardService (alinhamento de métricas do overview)
              ▲
              ├── Frontend: types/index.ts (CrmMetrics, LeadStageHistory, CrmDateRange)
              ├── Frontend: CrmDateFilter (seletor de período Geral/Hoje/7d/Mês/Custom)
              ├── Frontend: StageUndoToast (toast flutuante com timer de 8s e botão de desfazer)
              ├── Frontend: CrmPipeline & crm/page.tsx (integração do Kanban com Undo e métricas dinâmicas)
              └── Frontend: CommercialFunnelWidget & (dashboard)/page.tsx (Visão Geral com dados temporais)
```

---

## 2. Ordem de Implementação (Vertical Slices)

### Slice 1: Database Model & Migrações Prisma
- Atualizar `apps/backend/prisma/schema.prisma` adicionando o model `LeadStageHistory` e a relação `stageHistories` no model `Lead`.
- Executar `npx prisma migrate dev --name add_lead_stage_history`.
- Executar `npx prisma generate` para expor os tipos no `@prisma/client`.

### Slice 2: Backend Core - Histórico, Undo & Cálculo Temporal
- Criar `CrmMetricsQueryDto` com validação de `startDate`, `endDate`, `origemTipo`.
- Atualizar `updateCrmStage` em `leads.service.ts`:
  - Usar `prisma.$transaction` para atualizar o lead e registrar `LeadStageHistory(fromStage, toStage, reason)`.
- Implementar `undoLastStage(leadId)` em `leads.service.ts`:
  - Buscar a última transição com `isReverted: false`.
  - Marcar `isReverted: true` e `revertedAt: new Date()`.
  - Reverter `Lead.stage` para `fromStage` (ou `NOVO`).
- Atualizar `getCrmMetrics`:
  - Filtrar eventos de `LeadStageHistory` por período (ou all-time se datas omitidas).
  - Calcular `agendadosCount` (eventos `toStage = REUNIAO_AGENDADA` não revertidos).
  - Calcular `noShowCount` (eventos `toStage = NO_SHOW` não revertidos).
  - Computar `bookingRate` e `noShowRate` sobre as contagens de eventos.
- Expor endpoint `POST /leads/:id/crm-stage/undo` no `leads.controller.ts`.

### Slice 3: Backend Tests
- Adicionar testes em `leads.service.spec.ts` validando:
  - Registro de histórico a cada mudança de estágio.
  - Comportamento de `undoLastStage` (reversão do estágio e decremento das métricas).
  - Isolamento de eventos por filtro de data.

### Slice 4: Frontend - Componente de Filtro de Data & Tipagem
- Atualizar `apps/frontend/src/types/index.ts` com as interfaces atualizadas de métricas e tipos de filtro de período.
- Criar componente `apps/frontend/src/components/crm/crm-date-filter.tsx` com presets (*Geral*, *Hoje*, *Últimos 7 dias*, *Este Mês*, *Mês Anterior*, *Customizado*).

### Slice 5: Frontend - Toast Flutuante de Undo & Integração no Pipeline
- Criar componente de toast flutuante `StageUndoToast` com barra de progresso (8s) e botão "Desfazer".
- Integrar no `apps/frontend/src/app/(dashboard)/crm/page.tsx`:
  - Ao mover card no pipeline, abrir toast com os dados da transição.
  - Ao clicar em "Desfazer", disparar `POST /leads/:id/crm-stage/undo`, reverter a posição do card na tela e recarregar métricas.
  - Integrar `CrmDateFilter` ao lado dos filtros existentes, enviando `startDate` e `endDate` na busca de métricas.

### Slice 6: Frontend - Visão Geral do Dashboard
- Atualizar `apps/frontend/src/app/(dashboard)/page.tsx` e `commercial-funnel-widget.tsx` para sincronizar as métricas de conversão e taxas com a nova lógica.

---

## 3. Riscos & Mitigações
- **Risco:** Condição de corrida ao disparar múltiplos arrastos rápidos de cards.
  - **Mitigação:** Travar o card individual durante a requisição de transição e manter pilha simples de Undo para a última transição do usuário.
- **Risco:** Fuso horário / UTC no filtro de datas.
  - **Mitigação:** Tratar datas no padrão ISO 8601 início do dia (00:00:00) e fim do dia (23:59:59.999).
