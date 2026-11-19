# Tasks: MOVY Delivery Attendant Portal (`delivery-attendant-portal`) — V1

- [x] Task 1: Cliente HTTP Isolado (`concierge-portal-api.ts`) e Tela de Login do Delivery (`/concierge-portal/login`)
  - Acceptance: `apps/frontend/src/lib/concierge-portal-api.ts` implementa chamadas autenticadas para `http://localhost:3002/api/v1` (`login`, `getMe`, `getHandoffQueue`, `getConversationMessages`, `resolveConversation`, `getKnowledgeBase`, `updateQuickOps`, `updateFullKnowledgeBase`) com tratamento de HTTP 429 (`Retry-After`). `/concierge-portal/login/page.tsx` autentica o atendente/dono do delivery e redireciona para `/concierge-portal`.
  - Verify: Compilação TypeScript sem erros.
  - Files: `apps/frontend/src/lib/concierge-portal-api.ts`, `apps/frontend/src/app/concierge-portal/login/page.tsx`

- [x] Task 2: Painel do Atendente (`/concierge-portal/page.tsx`) — Fila de Transbordo, Quick-Ops e Base de Conhecimento
  - Acceptance: `/concierge-portal/page.tsx` exibe header do delivery, barra de Quick-Ops (toggle IA global, minutos de entrega/retirada de hoje e aviso do dia), Fila de Transbordo (`HUMAN_HANDOFF`) com motivo, resumo da IA, botão "Responder no WhatsApp" (`wa.me`) e botão "Resolvido / Devolver para a IA", modal de histórico da conversa e aba "Regras & Cardápio" exclusiva para `OWNER`. `ai-concierge-card.tsx` ganha botão de atalho para abrir o `/concierge-portal`.
  - Verify: `npx --prefix apps/frontend tsc -p apps/frontend/tsconfig.json --noEmit --incremental false` passa com 0 erros.
  - Files: `apps/frontend/src/app/concierge-portal/page.tsx`, `apps/frontend/src/components/clients/ai-concierge-card.tsx`

## Checkpoint: Complete
- [x] Todos os 4 módulos do `CAPABILITY-MAP-ai-concierge.md` implementados, testados e verificados com 0 erros.
