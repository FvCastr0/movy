# Technical Implementation Plan: MOVY System Redesign & Dynamic Pill Navbar

## Context & Objectives
Executar o redesign visual do sistema interno MOVY (`apps/frontend`), implementando a nova direção estética *Dark Modern Minimalist (High-End SaaS)* e introduzindo a **Floating Dynamic Pill Navbar** no topo com física de mola (`framer-motion`) e colapso responsivo circular em mobile (Opção A), mantendo `landing-page/` 100% intocada.

---

## 1. Arquitetura de Componentes & Dependências

```
apps/frontend/src/
├── app/
│   ├── globals.css                       [Atualizado com variáveis e gradientes de vidro]
│   └── (dashboard)/
│       ├── layout.tsx                    [Shell unificado: DynamicPillHeader + pt-24]
│       └── page.tsx                      [Integração estética minimalista]
├── components/
│   ├── layout/
│   │   ├── dynamic-pill-header.tsx       [NOVO: Floating Pill Navbar com motion.div + layoutId]
│   │   └── dashboard-header.tsx          [Deprecado / mantido para compatibilidade pontual]
│   └── dashboard/
│       └── dashboard-kpi-grid.tsx        [Cards minimalistas com micro-animação]
└── tailwind.config.ts                    [Tokens de cor e sombras de vidro]
```

---

## 2. Ordem de Implementação (Vertical Slices)

1. **Slice 1: Dependências e Tokens Visuais**
   - Instalação do `framer-motion` em `apps/frontend`.
   - Refinamento de `tailwind.config.ts` com tokens `surface.canvas` (`#09090B`), `surface.pill` (`rgba(18, 18, 21, 0.75)`), bordas translúcidas de precisão e sombras difusas.
   - Ajuste em `globals.css` para scrollbar oculta/fina e classes de backdrop-blur aprimoradas.

2. **Slice 2: Componente `DynamicPillHeader` (Navbar Flutuante)**
   - Construção de `dynamic-pill-header.tsx`:
     - Container: `fixed top-4 inset-x-0 mx-auto w-fit z-50`.
     - Pílula flutuante principal com `rounded-full border border-white/10 bg-zinc-950/75 backdrop-blur-xl shadow-2xl shadow-black/40 px-3 py-1.5`.
     - Abas com sliding background animado via `layoutId="activePill"` do `framer-motion`.
     - Responsividade (Opção A): em telas menores (`< md`), colapsa para pílula compacta com botão circular que abre menu suspenso flutuante com `AnimatePresence`.
     - Área de perfil e logout discreto com micro-interações.

3. **Slice 3: Layout Shell e Adaptação das Rotas**
   - Criar ou atualizar `apps/frontend/src/app/(dashboard)/layout.tsx` para carregar o `DynamicPillHeader` centralizado e aplicar padding superior adequado (`pt-24 pb-12 px-4 sm:px-6 max-w-7xl mx-auto`).
   - Remover invocações antigas e estáticas do cabeçalho em `(dashboard)/page.tsx` para evitar headers duplicados.

4. **Slice 4: Modernização Minimalista dos Cards do Dashboard**
   - Atualizar `dashboard-kpi-grid.tsx` com novo design minimalista:
     - Remoção de saturações excessivas; uso de hierarquia tipográfica e números tabulares (`tabular-nums`).
     - Micro-animações de stagger suave na entrada dos cards com `framer-motion`.

5. **Slice 5: Verificação de Compilação & Integridade**
   - Executar `npm run build` no `apps/frontend` e resolver qualquer erro de tipagem/SSR.
   - Validar que nenhum arquivo em `landing-page/` foi alterado.

---

## 3. Riscos & Mitigações

- **Risco de Hydration mismatch com Framer Motion:**
  - *Mitigação:* Usar `'use client'` em componentes animados e garantir renderização segura de layoutId com montagem controlada em `useEffect`.
- **Risco de quebra de layout em mobile por overflow horizontal:**
  - *Mitigação:* Esconder o grupo de links em telas `< md` e expor o botão circular com drawer/dropdown suspenso conforme Opção A aprovada.
- **Risco de sobreposição do conteúdo pelo header flutuante:**
  - *Mitigação:* Padding superior consistente no shell (`pt-24`) garantindo que nenhum card ou título fique oculto sob a barra.
