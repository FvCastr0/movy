# MOVY Design System — Interface Architecture

## Intent & Human
- **Who:** SDRs e Closers da MOVY gerenciando leads de donos de delivery sob alta pressão de tempo (SLA de contato < 30min).
- **Core Action:** Avaliar leads rapidamente, aplicar os 6 critérios de qualificação com precisão, identificar travas de reunião com o Closer e mover o lead no funil.
- **Feel:** Instrumento de precisão cirúrgica. Escuro, focado, contrastado, ultra-rápido, sem distrações cosméticas. Inspira autoridade e velocidade.

---

## Domain & Metaphor
- **Concepts:** Funil de Conversão, Scorecard de 6 Critérios SDR, Trava de Reunião com Closer, SLA de Resposta, Taxa de Qualificação, Ingestão de Landing Page.
- **Color World:**
  - `canvas`: `#0A0A0A` (preto profundo, sem brilho agressivo)
  - `surface-1`: `#121212` (painéis base e cards estruturais)
  - `surface-2`: `#18181B` (elevações secundárias, popovers e modais)
  - `surface-inset`: `#0E0E10` (campos de input e áreas de digitação rebaixadas)
  - `accent-movy`: `#E50914` (vermelho assinatura MOVY, usado cirurgicamente para CTAs principais e foco)
  - `accent-hover`: `#CC0812`
  - `border-subtle`: `rgba(255, 255, 255, 0.08)`
  - `border-emphasis`: `rgba(255, 255, 255, 0.16)`
  - `text-primary`: `#FAFAFA`
  - `text-secondary`: `#A1A1AA`
  - `text-tertiary`: `#71717A`
  - `semantic-success`: `#10B981` (Reunião Aprovada / Qualificado)
  - `semantic-warning`: `#F59E0B` (Em Desenvolvimento / Retorno)
  - `semantic-danger`: `#EF4444` (Desqualificado / Bloqueio de Closer)

---

## The Signature
- **Gate Radar de Qualificação:** Painel compacto com 6 indicadores táteis dos critérios mínimos da MOVY (Perfil ≥ 2, Operação ≥ 2, Necessidade ≥ 2, Investimento ≥ 2, Decisor = 3, Momento ≥ 2) calculando a soma (0-18) e destravando visualmente o botão de agendamento com Closer apenas quando todos os critérios mínimos são cumpridos.

---

## Hierarchy & Typographic Scale
- **Ratio:** 1.25 (Major Third)
- **Base:** 14px
  - `caption`: 11px / 500 / uppercase tracked (`tracking-wider`)
  - `body`: 14px / 400 (line-height 1.5)
  - `body-medium`: 14px / 500
  - `h4`: 16px / 600
  - `h3`: 18px / 600
  - `h2`: 22px / 600 (`tracking-tight`)
  - `h1`: 28px / 700 (`tracking-tight`)
  - `stat-hero`: 32px / 700 (com `font-variant-numeric: tabular-nums`)

---

## Depth Strategy
- **Borders & Inset Layering (Sem sombras pesadas):**
  - Dark mode com foco em anéis finos (`ring-1 ring-white/10`) e bordas suaves.
  - Inputs com preenchimento inset (`bg-black/50 border border-white/10 focus:border-red-600 focus:ring-1 focus:ring-red-600/30`).
  - Botões primários com active press (`active:scale-[0.98] transition-transform duration-100 ease-out`).
