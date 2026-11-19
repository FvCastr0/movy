# Implementation Plan: MOVY Delivery Attendant Portal (`delivery-attendant-portal`)

Source spec: `SPEC-delivery-attendant-portal.md` (Capability Map: `CAPABILITY-MAP-ai-concierge.md`)

## Overview

Implementar o Módulo 4 (`delivery-attendant-portal`), concluindo todos os 4 módulos do `CAPABILITY-MAP-ai-concierge.md`. Este módulo entrega o Portal Web enxuto do Atendente/Dono do Delivery (`/concierge-portal` e `/concierge-portal/login` dentro de `apps/frontend`), conectado diretamente ao microserviço isolado `apps/concierge-api` (porta `3002`), com foco em **Fila de Transbordo (`HUMAN_HANDOFF`)**, **Quick-Ops do Dia** e **Base de Conhecimento (`OWNER`)**.

## Architecture & Security Decisions

1. **Cliente HTTP Isolado (`concierge-portal-api.ts` — OWASP A01 / A04 / A05):**
   - Comunica-se diretamente com `NEXT_PUBLIC_CONCIERGE_API_URL` (`http://localhost:3002/api/v1`) com timeout de 8 segundos.
   - Armazena o JWT do atendente em chave isolada (`concierge_portal_token`), separada do token interno da agência MOVY.
   - Trata explicitamente HTTP `429 Too Many Requests` (lendo o cabeçalho `Retry-After`) e HTTP `401/403`.
2. **Radar de Transbordo sem Recriar o WhatsApp Web:**
   - Renderiza a fila `GET /api/v1/conversations/handoff-queue` com auto-refresh a cada 15s (apenas quando a aba do navegador está visível).
   - Cada card exibe o motivo do transbordo, o resumo gerado pela IA, as últimas 3 mensagens (e modal opcional de histórico completo), botão **"Responder no WhatsApp"** (`https://wa.me/...` com `rel="noopener noreferrer"`) e botão **"Resolvido / Devolver para a IA"** (`PATCH /api/v1/conversations/:id/resolve`).
3. **RBAC no Frontend + Backend (`OWNER` vs `ATTENDANT`):**
   - Tanto `OWNER` quanto `ATTENDANT` operam a **Fila de Transbordo** e o **Painel Rápido do Dia (`Quick-Ops`)**.
   - Apenas o `OWNER` visualiza e acessa a aba **"Base de Conhecimento & Regras da IA"** (`PUT /api/v1/knowledge-base`).

## Task List

### Phase 1: Isolated Concierge Portal HTTP Client & Login Page
- [x] Task 1: Criar `apps/frontend/src/lib/concierge-portal-api.ts` com tipagens completas, timeout de 8s, gestão isolada de sessão e tratamento de Rate Limit (`429`), e criar a tela de login `/concierge-portal/login/page.tsx`.

### Phase 2: Attendant Handoff Radar, Quick-Ops & Owner Knowledge Base
- [x] Task 2: Criar `/concierge-portal/page.tsx` com a Fila de Transbordo Prioritária (`HUMAN_HANDOFF`), modal de histórico da conversa, barra de Operação Rápida do Dia (`Quick-Ops`) e aba de Base de Conhecimento (`OWNER`), mais link de acesso rápido na tela do cliente da MOVY.

### Checkpoint: Complete
- [x] Type-check estrito (`tsc --noEmit`) limpo em `apps/frontend`, `apps/backend` e `apps/concierge-api`.
- [x] Suíte completa de testes unitários e OWASP passando 100%.
