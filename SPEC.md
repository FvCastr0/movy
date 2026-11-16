# Spec: MOVY Lead Engine & SDR Platform — V1

## Objective
Construir uma plataforma unificada de gestão comercial para a agência MOVY (nicho de deliveries), que:
1. Ingesta leads capturados no formulário da Landing Page existente.
2. Persiste imediatamente o lead no PostgreSQL e dispara, de forma resiliente e assíncrona, uma notificação formatada para o grupo comercial no WhatsApp via Evolution API (`120363413821500503@g.us`).
3. Fornece aos SDRs e gestores um painel autenticado (Next.js com JWT) para gerenciar o funil de vendas (Kanban e tabela), registrar follow-ups e realizar a pré-qualificação oficial conforme o Manual do SDR MOVY.
4. Digitaliza as regras de pontuação da planilha `MOVY-Qualificacao-SDR.xlsx` (6 critérios de 0 a 3, nota máxima 18, validação de critérios mínimos para reunião com closer) com suporte opcional a upload/parse do arquivo XLSX padrão para preenchimento de ficha.

---

## Tech Stack
- **Backend:** Node.js 20+, NestJS 10+, TypeScript, Prisma ORM.
- **Banco de Dados:** PostgreSQL 15 (reutilizando o serviço `evolution-postgres` no `docker-compose.yml`, provisionando o database `movy_db`).
- **Autenticação:** Passport-JWT + Bcrypt (segurança com tokens de acesso e hash de senhas).
- **Integração Externa:** Evolution API v2 (HTTP Client Axios para disparo em grupo WhatsApp).
- **Processamento de Planilhas:** `xlsx` / `exceljs` para leitura e escrita da ficha SDR compatível.
- **Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, Lucide React.
- **Validação:** `class-validator` + `class-transformer` (Backend) e `zod` + `react-hook-form` (Frontend).

---

## Commands
```bash
# === BACKEND (apps/backend) ===
Dev:      npm run start:dev
Build:    npm run build
Test:     npm run test
Lint:     npm run lint
Migrate:  npx prisma migrate dev --name <migration_name>
Studio:   npx prisma studio

# === FRONTEND (apps/frontend) ===
Dev:      npm run dev
Build:    npm run build
Test:     npm run test
Lint:     npm run lint

# === INFRAESTRUTURA DOCKER ===
Start DB: docker-compose up -d evolution-postgres
Full Env: docker-compose up -d
```

---

## Project Structure
```text
movy/
├── apps/
│   ├── backend/                     # API NestJS
│   │   ├── prisma/
│   │   │   └── schema.prisma        # Definição do schema e enums
│   │   ├── src/
│   │   │   ├── auth/                # Módulo de Autenticação JWT e Guards
│   │   │   ├── leads/               # Ingestão de leads da LP e CRUD do Funil
│   │   │   ├── qualification/       # Motor de cálculo dos 6 critérios e parser XLSX
│   │   │   ├── evolution/           # Cliente HTTP resiliente para Evolution API
│   │   │   ├── users/               # Gestão de usuários internos (SDR/Admin)
│   │   │   ├── common/              # DTOs compartilhados, filtros e interceptors
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   └── test/
│   └── frontend/                    # Painel Web Next.js (App Router)
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/login/    # Tela de login
│       │   │   └── (dashboard)/
│       │   │       ├── leads/       # Tabela e Kanban de Leads
│       │   │       ├── leads/[id]/  # Ficha do Lead & Qualificação SDR
│       │   │       └── settings/    # Configurações gerais
│       │   ├── components/          # Componentes visuais (Kanban, Scorecard, Inputs)
│       │   ├── lib/                 # Utilitários de API, fetcher e autenticação
│       │   └── types/               # Tipagens TypeScript
├── landing-page/                    # Landing page estática existente
│   ├── index.html                   # Formulário atualizado para disparar no backend
│   └── script.js                    # Integração de submissão do formulário
├── MOVY-Manual-SDR.pdf              # Documento base de regras de negócio
├── MOVY-Qualificacao-SDR.xlsx        # Planilha modelo oficial de qualificação
├── docker-compose.yml               # Orquestração do Postgres e Evolution API
└── SPEC.md                          # Este documento (fonte da verdade)
```

---

## Data Model & Schema (Prisma)

### Enums
- `LeadStage`: `NOVO`, `PRE_QUALIFICADO`, `DESQUALIFICADO`, `CONTATO_INICIADO`, `REUNIAO_AGENDADA`, `PROPOSTA_ENVIADA`, `GANHO`, `PERDIDO`.
- `LeadPriority`: `ALTA`, `EM_DESENVOLVIMENTO`, `BAIXA_PRONTIDAO`, `INCOMPLETA`.
- `MeetingCondition`: `ATENDIDAS`, `RESOLVER_CRITERIOS_MINIMOS`, `CONCLUIR_NOTAS`.
- `ForwardingAction`: `AGENDAR_CLOSER`, `COMBINAR_RETORNO`, `REVISAR_NOTAS`, `PREENCHER_FICHA`.
- `NotificationStatus`: `PENDING`, `SENT`, `FAILED`.

### Entidades Principais
1. **User:**
   - `id`, `name`, `email` (unique), `passwordHash`, `role` (`ADMIN`, `SDR`), `createdAt`, `updatedAt`.
2. **Lead:**
   - `id`, `nome`, `whatsapp`, `deliveryNome`, `segmento`, `cidade`, `stage` (default: `NOVO`).
   - `origem` (ex.: `LANDING_PAGE`, `MANUAL`, `XLSX`).
   - `notificationStatus` (default: `PENDING`), `notificationError` (texto se falhar).
   - Dados de Contexto SDR: `instagramCardapio`, `faturamentoMensal`, `pedidosMensais`, `ticketMedio`, `midiaAtualMensal`, `canalEntrada`, `decisoresCargos`, `prazoDesejadoInicio`, `problemaPrincipal`, `metaCliente`, `historicoAgencias`, `recursosDeclarados`.
   - `sdrResponsibleId` (FK opcional para User).
   - `createdAt`, `updatedAt`.
3. **LeadQualification (1:1 com Lead):**
   - Notas (0 a 3, nullable para indicar pendente):
     - `scorePerfil` (0 a 3)
     - `scoreCapacidadeOperacional` (0 a 3)
     - `scoreNecessidadeObjetivo` (0 a 3)
     - `scoreCapacidadeInvestir` (0 a 3)
     - `scoreAcessoDecisor` (0 a 3)
     - `scoreMomentoContratacao` (0 a 3)
   - Justificativas textuais para cada uma das 6 notas.
   - Campos Computados:
     - `totalScore` (0 a 18, null se incompleto).
     - `priority` (`LeadPriority`).
     - `meetingCondition` (`MeetingCondition`).
     - `forwardingAction` (`ForwardingAction`).
   - `pendenciasCloser`, `proximaAcao`, `dataProximoContato`, `motivoPerda`.
   - `updatedAt`.
4. **LeadFollowUp (1:N com Lead):**
   - `id`, `leadId`, `userId`, `notes`, `scheduledAt`, `createdAt`.

---

## Business Logic: Regras Oficiais de Qualificação SDR (Manual MOVY)

### 1. Escala de Notas (0 a 3 por critério)
*Nota em branco significa PENDENTE. O valor `0` é nota avaliada, não ausência de informação.*
- **Perfil do negócio:** 0 = Fora de alimentação | 1 = Alimentação sem delivery | 2 = Em implantação com data | 3 = Já operando.
- **Capacidade operacional:** 0 = Problemas graves | 1 = Gargalos sem prazo | 2 = Cresce com ajustes planejados | 3 = Equipe e cozinha comportam mais pedidos.
- **Necessidade e objetivo:** 0 = Não identifica necessidade | 1 = Quer vender mais sem foco | 2 = Problema concreto e prioridade | 3 = Problema, prioridade e meta mensurável.
- **Capacidade de investir:** 0 = Não pode/não pretende investir | 1 = Só após retorno | 2 = Recursos previstos, aprovação pendente | 3 = Recursos disponíveis e autonomia.
- **Acesso ao decisor:** 0 = Sem acesso | 1 = Pode encaminhar, sem confirmação | 2 = Decisor identificado, participação pendente | 3 = Decisor confirmado na reunião.
- **Momento de contratação:** 0 = Sem previsão | 1 = Mais de 90 dias | 2 = Entre 31 e 90 dias | 3 = Até 30 dias.

### 2. Validação e Classificação da Soma
- **Total:** Soma de 0 a 18 (apenas quando todas as 6 notas forem preenchidas).
- **Classificação:**
  - `14 a 18`: Prioridade Alta.
  - `10 a 13`: Oportunidade em Desenvolvimento.
  - `0 a 9`: Baixa Prontidão.
  - Se faltar qualquer nota: *Qualificação Incompleta*.

### 3. Regra de Ouro: Condições Obrigatórias para Agendar Reunião com Closer
A soma por si só **não** autoriza o agendamento. São obrigatórios simultaneamente:
- `Perfil do negócio >= 2`
- `Capacidade operacional >= 2`
- `Necessidade e objetivo >= 2`
- `Capacidade de investir >= 2`
- `Acesso ao decisor == 3` (Decisor confirmado)
- `Momento de contratação >= 2` (Início pretendido em até 90 dias)

Se todos forem atendidos: `Encaminhamento = Agendar com closer`.
Se faltar qualquer um: `Encaminhamento = Combinar retorno e resolver pendências`.

---

## Integration: Evolution API (WhatsApp Group)
- **Instância:** `bot movy` (com URL-encoding seguro `bot%20movy` nas requisições HTTP).
- **Endpoint:** `POST /message/sendText/{instance}`
- **Destino:** `120363413821500503@g.us`
- **Payload Formatado:**
  ```text
  🔔 *NOVO LEAD RECEBIDO — MOVY*

  👤 *Nome:* Carlos Silva
  📱 *WhatsApp:* (11) 99999-9999
  🍕 *Delivery:* Fornalha Pizzaria
  🏷️ *Segmento:* Pizzaria
  📍 *Cidade:* Campinas / SP
  ⏱️ *Data/Hora:* 16/11/2026 15:15

  👉 _Acesse o painel para iniciar a qualificação do lead._
  ```
- **Resiliência:** Executado em background via interceptor/service com fallback. O lead é salvo no banco com `notificationStatus = PENDING`. Em caso de erro na Evolution API, o status vira `FAILED` com log de erro, permitindo reenvio manual ou retry assíncrono pelo painel.

---

## Initial Seed & Acesso
- O projeto incluirá um script de seed do Prisma (`prisma/seed.ts` via `npx prisma db seed`) que cria:
  - Usuário Administrador inicial: `admin@movy.com.br`
  - Senha padrão inicial (criptografada com bcrypt, configurável via variável de ambiente `INITIAL_ADMIN_PASSWORD`).
  - Perfil: `ADMIN`.

---

## Code Style & Standards
- Código limpo, fortemente tipado com TypeScript em modo `strict`.
- DTOs do NestJS usando `class-validator` e `class-transformer` em todos os endpoints.
- Componentes React puros e reutilizáveis, seguindo padrões de design system moderno (Dark/Light mode contrastante, alinhado com a identidade visual da MOVY).
- Tratamento de exceções centralizado (`HttpExceptionFilter`) retornando respostas JSON consistentes: `{ statusCode, message, errors, timestamp }`.

---

## Testing Strategy
- **Unit Tests:** Validação estrita do cálculo das regras do SDR (garantir que notas mínimas, prioridades e encaminhamentos batam 100% com as fórmulas do Excel).
- **Integration Tests:** Teste de rota de ingestão de lead (persistência + mock da Evolution API).
- **E2E / Smoke:** Verificação de autenticação JWT e endpoints protegidos.

---

## Boundaries
- **Always do:**
  - Persistir o lead no banco antes de qualquer chamada externa.
  - Validar todos os inputs da landing page e da qualificação.
  - Manter hash de senhas com bcrypt (mínimo cost factor 10).
  - Seguir estritamente a pontuação 0–3 e as regras de agendamento do Manual SDR.
- **Ask first:**
  - Alterações no schema do banco que excluam colunas existentes.
  - Inclusão de novas dependências pesadas de terceiros.
- **Never do:**
  - Expor credenciais, chaves da Evolution API ou JWT secrets em código fonte ou commits.
  - Permitir que falhas de rede da Evolution API quebrem a resposta da Landing Page.
  - Modificar o formulário da landing page quebrando classes de estilo existentes.

---

## Success Criteria
1. O formulário em `landing-page/index.html` envia dados via AJAX para o NestJS e exibe feedback de sucesso visual.
2. O lead é salvo no PostgreSQL (`movy_db`) e uma mensagem chega no grupo WhatsApp `120363413821500503@g.us`.
3. Usuário SDR/Admin faz login no painel Next.js e visualiza a lista de leads em tempo real.
4. SDR consegue preencher os 6 critérios na interface web e o sistema calcula a pontuação, prioridade e encaminhamento idênticos à planilha Excel.
5. SDR consegue anexar a planilha `.xlsx` preenchida de um lead e o sistema extrai as notas e textos para a ficha no banco.

---

## Out of Scope (Deferred - V2)
- Portal de autoatendimento para o cliente final do delivery.
- Disparo de mensagens automáticas de WhatsApp direto para o lead (apenas notificação interna no grupo na V1).
- Múltiplos pipelines/funis configuráveis (o pipeline é fixo no MVP).
- Integração direta com Meta Ads API para cálculo automático de ROAS.

---

## Open Questions
- *Nenhuma pendência aberta no momento. Todas as definições de instância (`bot movy`), JID (`120363413821500503@g.us`), regras SDR, banco de dados (`movy_db`) e seed inicial (`admin@movy.com.br`) foram alinhadas e incorporadas.*
