# Spec Delta: CRM Commercial Event-Driven Metrics & Stage Undo — V1

Status: approved

## Objective
Migrar o cálculo das métricas comerciais de **No-Show** e **Agendamentos** do modelo ingênuo de "snapshot de estágio atual" para uma arquitetura orientada a **histórico de eventos de transição (`LeadStageHistory`)**. 

Isso garante que:
1. Reuniões agendadas e ocorrências de no-show não sejam perdidas quando um lead avança para proposta, é remarcado ou movido para perdido.
2. Seja possível auditar e desfazer transições executadas por engano humano (Undo) via **Toast Flutuante Temporário com Ação de Desfazer**, diminuindo os contadores de métricas de forma consistente.
3. As taxas reflitam por padrão o acumulado geral, mas possam ser filtradas por recortes temporais (*Hoje*, *Últimos 7 dias*, *Este Mês*, *Mês Anterior*, ou *Customizado*) tanto no CRM (`/crm`) quanto na Visão Geral (`/`).

---

## Assumptions I'm Making (Premissas)
1. **Histórico via Tabela Dedicada (`LeadStageHistory`):** Criaremos uma tabela no PostgreSQL via Prisma para registrar cada mudança de estágio (`fromStage`, `toStage`, `reason`, `isReverted`, `createdAt`).
2. **Ambiente Pré-Produção:** O sistema ainda não está em uso em produção; portanto, não é necessário script de backfill/migração de leads legados.
3. **Mecanismo de Desfazer via Toast Flutuante:** Ao arrastar ou alterar o estágio de um lead, um toast flutuante com temporizador (8 a 10s) e botão "Desfazer" é disparado na UI. Ao clicar em "Desfazer", chama `POST /leads/:id/crm-stage/undo`, marcando o evento como `isReverted = true` e restaurando o estágio imediatamente anterior (`fromStage`).
4. **Visão Geral Padrão (All-Time):** Sem filtro de data ativo, as métricas consideram todo o histórico acumulado. Quando datas são enviadas (`startDate` e `endDate`), os eventos são filtrados pela data de ocorrência (`createdAt` do histórico).
5. **Fórmula da Taxa de No-Show:** 
   $$\text{Taxa No-Show} = \frac{\text{Total de Eventos NO\_SHOW (não revertidos no período)}}{\text{Total de Eventos REUNIAO\_AGENDADA (não revertidos no período)}} \times 100$$
   Se o total de agendamentos no período for 0, a taxa é 0.0%.

---

## Commands
```bash
# Backend (em apps/backend)
npx prisma migrate dev --name add_lead_stage_history  # Criar e aplicar migração do schema
npx prisma generate                                  # Atualizar Prisma Client
npm run test                                         # Testes unitários Jest
npm run build                                        # Compilação NestJS

# Frontend (em apps/frontend)
npm run lint                                         # Validação ESLint / TypeScript
npm run build                                        # Build de produção Next.js
npm run dev                                          # Servidor local de desenvolvimento
```

---

## Project Structure
```
apps/backend/
├── prisma/
│   └── schema.prisma                  # Adição do model LeadStageHistory e relação no Lead
├── src/
│   ├── leads/
│   │   ├── dto/
│   │   │   ├── crm-metrics-query.dto.ts     # DTO de query params (origemTipo, startDate, endDate)
│   │   │   └── undo-stage-response.dto.ts   # DTO de resposta da ação de desfazer
│   │   ├── leads.controller.ts        # POST /leads/:id/crm-stage/undo e parâmetros em GET /leads/crm-metrics
│   │   └── leads.service.ts           # Registro de histórico, lógica de undo e cálculo temporal de métricas
│   └── dashboard/
│       ├── dashboard.controller.ts    # Parâmetros de data no overview comercial
│       └── dashboard.service.ts       # Integração com métricas históricas no Cockpit

apps/frontend/
├── src/
│   ├── app/(dashboard)/
│   │   ├── crm/
│   │   │   └── page.tsx               # Barra de filtro temporal + ação de desfazer (Undo)
│   │   └── page.tsx                   # Visão Geral: filtro temporal sincronizado com métricas comerciais
│   ├── components/
│   │   ├── crm/
│   │   │   ├── crm-kpi-cards.tsx      # Exibição de totais absolutos de agendamentos e no-shows além das %
│   │   │   ├── crm-pipeline.tsx       # Suporte a gatilho visual de Undo ao mover cards
│   │   │   └── crm-date-filter.tsx    # Seletor de período (Geral, Hoje, 7d, Mês, Custom)
│   │   └── dashboard/
│   │       └── commercial-funnel-widget.tsx # Widget atualizado com taxas históricas reais
│   └── types/
│       └── index.ts                   # Interfaces atualizadas (CrmMetrics, LeadStageHistory)
```

---

## Code Style & Contracts

### 1. Model Prisma: `LeadStageHistory`
```prisma
model LeadStageHistory {
  id          String     @id @default(uuid())
  leadId      String
  lead        Lead       @relation(fields: [leadId], references: [id], onDelete: Cascade)
  fromStage   LeadStage?
  toStage     LeadStage
  reason      String?
  isReverted  Boolean    @default(false)
  revertedAt  DateTime?
  userId      String?
  user        User?      @relation(fields: [userId], references: [id], onDelete: SetNull)
  createdAt   DateTime   @default(now())

  @@index([leadId])
  @@index([toStage, createdAt])
  @@index([createdAt])
  @@map("lead_stage_histories")
}
```

### 2. Endpoints e Contratos de Dados

#### `GET /leads/crm-metrics`
**Query Parameters:**
- `origemTipo?: 'INBOUND' | 'OUTBOUND'`
- `startDate?: string` (ISO 8601 ou YYYY-MM-DD)
- `endDate?: string` (ISO 8601 ou YYYY-MM-DD)

**Response:**
```typescript
export interface CrmMetricsResponseDto {
  totalLeads: number;
  totalInbound: number;
  totalOutbound: number;
  agendadosCount: number;         // Total de reuniões agendadas no período (eventos não revertidos)
  noShowCount: number;            // Total de faltas no-show no período (eventos não revertidos)
  fechadosCount: number;          // Total de contratos fechados no período
  reunioesRealizadasCount: number;// Reuniões que evoluíram para proposta/fechamento
  bookingRate: number;            // (agendadosCount / totalLeads) * 100
  noShowRate: number;             // (noShowCount / agendadosCount) * 100
  winRate: number;                // (fechadosCount / reunioesRealizadasCount) * 100
  totalPipelineValue: number;
  closedRevenueValue: number;
  stageCounts: Record<string, number>;
}
```

#### `POST /leads/:id/crm-stage/undo`
Reverte a última transição de estágio do lead:
1. Encontra o último `LeadStageHistory` com `leadId = id` e `isReverted = false`.
2. Se não existir, retorna `400 Bad Request` ("Nenhuma transição recente disponível para desfazer").
3. Marca o registro como `isReverted = true` e preenche `revertedAt = now()`.
4. Atualiza `Lead.stage = history.fromStage` (ou `NOVO` se nulo).
5. Retorna o lead com estágio restaurado e as métricas recalculadas.

---

## Testing Strategy
- **Backend (Jest):**
  - Teste unitário em `leads.service.spec.ts`:
    - Criação de lead registra histórico inicial.
    - Transição para `REUNIAO_AGENDADA` incrementa `agendadosCount`.
    - Transição subsequente para `NO_SHOW` incrementa `noShowCount`.
    - Reagendamento subsequente para `REUNIAO_AGENDADA` mantém 1 `noShowCount` e incrementa para 2 `agendadosCount`.
    - Execução do `undo` reverte o último evento, decrementa o contador nas métricas e restaura o estágio anterior do lead.
    - Filtro de data: eventos fora do range `startDate`/`endDate` não são computados.
- **Frontend:**
  - Build do Next.js sem erros de tipagem (`npm run build`).
  - Renderização do seletor de data (`CrmDateFilter`) com opções: *Geral*, *Hoje*, *Últimos 7 dias*, *Este Mês*.
  - Teste visual do botão/toast de **Desfazer** após arrastar card no Kanban.

---

## Boundaries
- **Always do:**
  - Preservar integridade referencial: exclusão de lead em cascata remove seus históricos.
  - Ignorar eventos marcados com `isReverted: true` nos cálculos das métricas.
  - Manter compatibilidade com chamadas sem parâmetros de data (comportamento padrão = Geral / All-Time).
  - Executar as operações de transição e gravação de histórico dentro de uma transação Prisma (`prisma.$transaction`).
- **Ask first:**
  - Exclusão física permanente de registros de histórico (soft-revert via `isReverted` é a regra).
- **Never do:**
  - Calcular `noShowRate` dependendo exclusivamente de `lead.stage === 'NO_SHOW'`.
  - Permitir `undo` de estágios de outros leads ou sem transição anterior registrada.
  - Quebrar os componentes da rota `/leads` (qualificação de SDR).

---

## Success Criteria (Critérios de Sucesso Testáveis)
1. **Rastreabilidade Histórica:**
   - Ao mover um lead de *Novo* $\to$ *Reunião Agendada* $\to$ *No-Show* $\to$ *Reunião Agendada* $\to$ *Fechado*, o histórico registra 4 eventos.
   - O contador de `noShowCount` permanece como 1 (e não zera ao mover para Reunião ou Fechado).
2. **Mecanismo de Desfazer (Undo):**
   - Ao disparar `POST /leads/:id/crm-stage/undo`, o lead retorna ao estágio anterior e a métrica é recalculada sem a transição revertida.
3. **Filtro Temporal no CRM e Visão Geral:**
   - Na ausência de filtros, exibe o acumulado geral.
   - Ao selecionar *Este Mês*, as métricas mostram apenas agendamentos e no-shows ocorridos no mês corrente.
4. **Build & CI Verificados:**
   - `apps/backend`: Compilação NestJS e testes passando com código de saída 0.
   - `apps/frontend`: `npm run build` executado com código de saída 0.

---

## Out of Scope (Deferred - V2 Backlog)
- Linha do tempo visual completa de auditoria aberta em gaveta lateral por lead.
- Exportação de relatório em CSV/Excel de todas as transições históricas.
- SLA de tempo médio gasto pelo lead em cada etapa do funil comercial.

---

## Open Questions
1. **Janela de Desfazer (Undo):** Você prefere que a opção de "Desfazer" fique disponível por um tempo limitado após a ação (ex: toast de 10 segundos na tela com botão "Desfazer") ou que haja um botão "Desfazer última movimentação" dentro do card/modal do lead a qualquer momento?
2. **Dados Legados:** Para os leads que já estão hoje no banco como `NO_SHOW` ou `REUNIAO_AGENDADA` antes dessa tabela existir, podemos rodar um script de migração/seed simples que gera o evento inicial para que eles já contem no "Geral"?
