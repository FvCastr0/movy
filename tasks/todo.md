# Tasks: MOVY System Redesign & Dynamic Pill Navbar

- [x] Task 1: Instalação de Dependências e Configuração de Tokens Visuais
  - Acceptance: `framer-motion` adicionado a `apps/frontend/package.json` e instalado. `tailwind.config.ts` enriquecido com tokens refinados de superfície, bordas e efeitos de vidro. `globals.css` atualizado com suporte a backdrop e scroll elegante.
  - Verify: `npm list framer-motion` dentro de `apps/frontend` retorna a versão instalada sem erros.
  - Files: `apps/frontend/package.json`, `apps/frontend/tailwind.config.ts`, `apps/frontend/src/app/globals.css`

- [x] Task 2: Componente `DynamicPillHeader` (Navbar Flutuante Circular com Spring Physics)
  - Acceptance: `apps/frontend/src/components/layout/dynamic-pill-header.tsx` implementado como componente de cliente com barra em cápsula (`rounded-full`), `backdrop-blur-xl`, abas animadas com sliding pill via `layoutId="activePill"`, logo minimalista, perfil de usuário e colapso responsivo para mobile (Opção A) com menu dropdown suspenso flutuante.
  - Verify: Arquivo criado e tipado sem erros de TypeScript (`npx tsc --noEmit`).
  - Files: `apps/frontend/src/components/layout/dynamic-pill-header.tsx`

- [x] Task 3: Integração do Shell do Dashboard e Limpeza de Cabeçalhos Antigos
  - Acceptance: `apps/frontend/src/app/(dashboard)/layout.tsx` configurado com o `DynamicPillHeader` fixo no topo e container de conteúdo com padding superior (`pt-24`) para evitar sobreposição. `page.tsx` limpo de referências duplicadas ao antigo header.
  - Verify: Acesso e renderização das rotas `(dashboard)/page.tsx` sem duplicação de cabeçalho.
  - Files: `apps/frontend/src/app/(dashboard)/layout.tsx`, `apps/frontend/src/app/(dashboard)/page.tsx`

- [x] Task 4: Modernização Minimalista dos Cards do Dashboard com Micro-Animações
  - Acceptance: `dashboard-kpi-grid.tsx` atualizado para estética minimalista, com bordas finas translúcidas, números tabulares e micro-animação de entrada suave via `framer-motion`.
  - Verify: Componente compila e renderiza com transição suave nos cards.
  - Files: `apps/frontend/src/components/dashboard/dashboard-kpi-grid.tsx`

- [ ] Task 5: Validação Final de Build e Integridade de Escopo
  - Acceptance: `npm run build` do Next.js compila com código 0 e sem warnings críticos. O diretório `landing-page/` permanece 100% inalterado (validado via git status).
  - Verify: `cd apps/frontend && npm run build` e `git status --porcelain landing-page` retorna vazio.
  - Files: `tasks/todo.md`
