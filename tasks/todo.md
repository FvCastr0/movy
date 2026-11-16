# Task Backlog: MOVY Lead Engine & SDR Platform

## Phase 1: Fundação & Infraestrutura (Slice 0)

### Task 1: Setup do Banco de Dados PostgreSQL & Prisma Schema
**Description:** Provisionar o banco de dados `movy_db` no serviço Postgres existente e estruturar o schema Prisma inicial com todas as tabelas (`User`, `Lead`, `LeadQualification`, `LeadFollowUp`), enums de status e relacionamentos.
**Acceptance criteria:**
- [ ] Banco `movy_db` provisionado no PostgreSQL local via docker.
- [ ] `schema.prisma` criado com as entidades especificadas no `SPEC.md`.
- [ ] Migration inicial executada com sucesso.
**Verification:**
- [ ] `npx prisma migrate dev` executa sem erros.
- [ ] `npx prisma db push` ou schema verificado via client.
**Dependencies:** None
**Files likely touched:**
- `docker-compose.yml`
- `apps/backend/prisma/schema.prisma`
- `.env`

---

### Task 2: Scaffold do Backend NestJS & Configuração Global
**Description:** Inicializar o projeto NestJS na pasta `apps/backend`, configurar `ConfigModule`, `PrismaModule`/`PrismaService`, CORS para permitir origens da landing page e do frontend, e filtro global de tratamento de exceções.
**Acceptance criteria:**
- [ ] Projeto NestJS rodando com TypeScript estrito.
- [ ] `PrismaService` injetável e conectado ao banco.
- [ ] Validação global via `ValidationPipe` ativa.
**Verification:**
- [ ] `npm run build` no backend compila com sucesso.
- [ ] Endpoint `GET /api/health` retorna `{ status: 'ok' }`.
**Dependencies:** Task 1
**Files likely touched:**
- `apps/backend/package.json`
- `apps/backend/src/main.ts`
- `apps/backend/src/app.module.ts`
- `apps/backend/src/prisma/prisma.service.ts`

---

### Task 3: Scaffold do Frontend Next.js (App Router + Tailwind)
**Description:** Inicializar o projeto Next.js na pasta `apps/frontend` com TypeScript, Tailwind CSS e ícones do Lucide React, definindo o layout base e paleta visual dark/moderna da MOVY.
**Acceptance criteria:**
- [ ] Next.js 14+ rodando com App Router.
- [ ] Tailwind configurado com as cores da identidade visual (preto, vermelho acento `#E50914`, cinzas neutros).
**Verification:**
- [ ] `npm run build` no frontend compila sem erros de tipagem.
- [ ] Página inicial carregando limpa no navegador.
**Dependencies:** None
**Files likely touched:**
- `apps/frontend/package.json`
- `apps/frontend/tailwind.config.ts`
- `apps/frontend/src/app/layout.tsx`

---

## Phase 2: Ingestão de Leads & WhatsApp (Slice 1)

### Task 4: Endpoint de Ingestão de Leads & Service de Notificação WhatsApp
**Description:** Criar o módulo `leads` no NestJS com endpoint `POST /api/leads/capture`, DTO validado com `class-validator`, persistência imediata com status `PENDING`, e serviço de mensageria assíncrona integrando com a Evolution API (`POST /message/sendText/bot%20movy` para `120363413821500503@g.us`).
**Acceptance criteria:**
- [ ] DTO valida campos obrigatórios (`nome`, `whatsapp`, `deliveryNome`, `segmento`, `cidade`).
- [ ] Lead é salvo no banco antes de qualquer requisição de rede.
- [ ] Disparo assíncrono para a Evolution API com formatação em markdown limpo.
- [ ] Atualização de `notificationStatus` para `SENT` ou `FAILED` sem derrubar a requisição do usuário.
**Verification:**
- [ ] Teste unitário e de integração do service de mensageria com mock da Evolution API.
- [ ] Teste de chamada cURL/POST salvando lead no banco.
**Dependencies:** Task 2
**Files likely touched:**
- `apps/backend/src/leads/leads.controller.ts`
- `apps/backend/src/leads/leads.service.ts`
- `apps/backend/src/leads/dto/capture-lead.dto.ts`
- `apps/backend/src/evolution/evolution.service.ts`

---

### Task 5: Integração do Formulário da Landing Page
**Description:** Atualizar o arquivo `landing-page/script.js` para interceptar o submit do formulário `#leadForm`, sanitizar os dados e enviar via `fetch` assíncrono para o endpoint do backend com feedback visual (loading spinner, mensagem de confirmação e tratamento de erro de rede).
**Acceptance criteria:**
- [ ] Submissão do formulário dispara POST no backend sem recarregar a página.
- [ ] Exibe feedback de sucesso elegante ao usuário após envio.
- [ ] Mantém estilos e validações visuais nativas já existentes no form.
**Verification:**
- [ ] Submeter o formulário na landing page e verificar a criação do registro no PostgreSQL.
**Dependencies:** Task 4
**Files likely touched:**
- `landing-page/script.js`
- `landing-page/index.html`

---

## Phase 3: Autenticação Segura & Seed de Usuários (Slice 2)

### Task 6: Módulo de Autenticação JWT no Backend & Seed Admin
**Description:** Implementar autenticação no NestJS com Passport JWT, bcrypt para hashing de senha, endpoint `POST /api/auth/login`, `JwtAuthGuard`, e script `prisma/seed.ts` para criar o usuário `admin@movy.com.br`.
**Acceptance criteria:**
- [x] Rota `POST /api/auth/login` valida credenciais e retorna JWT assinado.
- [x] Guard `JwtAuthGuard` protege rotas administrativas.
- [x] Script de seed cria o usuário inicial de forma idempotente (não duplica se já existir).
**Verification:**
- [x] `npx prisma db seed` executa e cria usuário com senha hasheada.
- [x] Teste de login com credenciais válidas retorna token 200 OK; credenciais inválidas retornam 401 Unauthorized.
**Dependencies:** Task 2
**Files likely touched:**
- `apps/backend/src/auth/auth.module.ts`
- `apps/backend/src/auth/auth.service.ts`
- `apps/backend/src/auth/jwt.strategy.ts`
- `apps/backend/prisma/seed.ts`

---

### Task 7: Tela de Login & Proteção de Rotas no Next.js
**Description:** Criar página `/login` no Next.js com formulário de autenticação, armazenamento seguro de sessão/token, e middleware de rota para redirecionar usuários não autenticados para `/login`.
**Acceptance criteria:**
- [x] Interface de login profissional com validação de campos baseada na skill interface-design.
- [x] Usuário logado com sucesso é redirecionado para `/leads`.
- [x] Rotas `/leads/*` e `/dashboard` bloqueadas para visitantes anônimos via middleware Next.js.
**Verification:**
- [x] Tentar acessar `/leads` sem token redireciona para `/login`.
- [x] Fazer login com `admin@movy.com.br` acessa a área restrita.
**Dependencies:** Task 3, Task 6
**Files likely touched:**
- `apps/frontend/src/app/(auth)/login/page.tsx`
- `apps/frontend/src/middleware.ts`
- `apps/frontend/src/lib/auth.ts`

---

## Phase 4: Motor de Qualificação SDR & XLSX (Slice 3)

### Task 8: Regras Oficiais de Qualificação SDR (Engine & Unit Tests)
**Description:** Implementar a lógica pura de qualificação comercial conforme o Manual do SDR MOVY e as fórmulas do Excel:
- Notas 0 a 3 nos 6 critérios (Perfil, Operação, Necessidade, Investimento, Decisor, Momento).
- Nota máxima 18. Nota nula = pendente (não é zero).
- Prioridade: Alta (14-18), Em Desenvolvimento (10-13), Baixa Prontidão (0-9).
- Condição de reunião obrigatória com Closer: Perfil >= 2, Operação >= 2, Necessidade >= 2, Investimento >= 2, Decisor = 3, Momento >= 2.
- Encaminhamento automático: Agendar com closer vs Combinar retorno.
**Acceptance criteria:**
- [ ] Cálculo 100% aderente às fórmulas do `MOVY-Qualificacao-SDR.xlsx`.
- [ ] Suíte de testes unitários cobrindo todos os casos de borda do manual.
**Verification:**
- [ ] `npm run test` valida a suíte da engine SDR com 100% de sucesso.
**Dependencies:** Task 2
**Files likely touched:**
- `apps/backend/src/qualification/qualification-engine.ts`
- `apps/backend/src/qualification/qualification-engine.spec.ts`

---

### Task 9: Leitor e Exportador XLSX Compatível com o Modelo MOVY
**Description:** Implementar service no NestJS capaz de receber o arquivo `.xlsx` padrão preenchido pelo SDR, extrair os dados e notas para o banco, e permitir o download da planilha preenchida do lead.
**Acceptance criteria:**
- [ ] Parser do buffer `.xlsx` identifica os campos e notas das células padrão da planilha.
- [ ] Endpoint `POST /api/leads/:id/qualification/import-xlsx` com upload multipart.
- [ ] Endpoint `GET /api/leads/:id/qualification/export-xlsx` gerando a planilha formatada.
**Verification:**
- [ ] Fazer upload da planilha modelo e verificar que as notas foram salvas no banco para o lead.
**Dependencies:** Task 8
**Files likely touched:**
- `apps/backend/src/qualification/qualification-xlsx.service.ts`
- `apps/backend/src/qualification/qualification.controller.ts`

---

## Phase 5: Painel Web de Gestão & Ficha do Lead (Slice 4)

### Task 10: Tabela de Leads & Pipeline Kanban no Frontend
**Description:** Construir a interface principal do painel Next.js:
- Tabela de leads com paginação, busca e filtros rápidos por status e prioridade.
- Visão Kanban com colunas pelas etapas do funil (`NOVO`, `PRE_QUALIFICADO`, `CONTATO_INICIADO`, `REUNIAO_AGENDADA`, `PROPOSTA_ENVIADA`, `GANHO`, `PERDIDO`) com movimentação rápida de status e Micro-Radar SDR.
**Acceptance criteria:**
- [x] Alternância entre visualização em Tabela e Kanban.
- [x] Micro-Radar de 6 pinos (P, O, N, I, D, M) embutido nos cards para diagnóstico sem abrir a ficha.
- [x] Badge colorido indicando a prioridade do lead (Alta, Em Desenvolvimento, Baixa Prontidão).
- [x] Atualização otimista instantânea no Kanban com persistência em background e rollback em caso de erro.
**Verification:**
- [x] Navegar pelos leads, filtrar por status e arrastar/mudar de etapa no Kanban.
- [x] `npm run build` no frontend valida rotas estáticas e tipos com 100% de sucesso.
**Dependencies:** Task 4, Task 7
**Files likely touched:**
- `apps/frontend/src/app/(dashboard)/leads/page.tsx`
- `apps/frontend/src/components/leads/lead-table.tsx`
- `apps/frontend/src/components/leads/lead-kanban.tsx`
- `apps/frontend/src/components/leads/micro-radar.tsx`

---

### Task 11: Ficha Completa do Lead, Scorecard SDR & Histórico de Follow-up
**Description:** Construir a página de detalhes `/leads/[id]`:
- Exibição de todos os dados cadastrais e de contexto do lead com atalho direto para WhatsApp.
- Scorecard interativo com os 6 critérios do SDR (seletores táteis de 0 a 3 e justificativas).
- Card de resultado com cálculo dinâmico da soma (0-18), badge de prioridade e trava visual do Closer.
- Linha do tempo de Follow-up com registro de novas notas e histórico cronológico.
**Acceptance criteria:**
- [x] SDR pontua os critérios e a interface atualiza o total, prioridade e encaminhamento instantaneamente.
- [x] Trava visual avisando exatamente qual critério impede o agendamento se faltar algum mínimo (ex: Decisor = 3).
- [x] Registro de notas de follow-up salvo e exibido cronologicamente.
**Verification:**
- [x] Simular atendimento de lead, pontuar critérios e validar persistência no backend.
- [x] Rota dinâmica `/leads/[id]` compilada com sucesso no Next.js.
**Dependencies:** Task 8, Task 9, Task 10
**Files likely touched:**
- `apps/frontend/src/app/(dashboard)/leads/[id]/page.tsx`

---

## Phase 6: Orquestração Docker & Deploy Unificado

### Task 12: Dockerização Completa (Backend, Frontend, Postgres & Evolution API)
**Description:** Criar Dockerfiles multi-stage para backend e frontend, script de inicialização do PostgreSQL para criação automática do `movy_db`, e orquestrar todo o ecossistema no `docker-compose.yml`.
**Acceptance criteria:**
- [x] `apps/backend/Dockerfile` multi-stage com compilação e migração Prisma automática.
- [x] `apps/frontend/Dockerfile` multi-stage com Next.js em modo produção.
- [x] Script `docker/init-movy-db.sql` provisionando o `movy_db` de forma idempotente.
- [x] `docker-compose.yml` orquestrando os 4 serviços na rede interna com healthchecks.
**Verification:**
- [x] `docker-compose -f docker-compose.yml config` validado sem erros de sintaxe.
