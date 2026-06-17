# ProFrance Visual Transfer Kit

> Kit final compacto e copy-ready. Empacota o melhor de três fontes:
> [`audit`](./profrance-visual-system-audit.md) · [`bible`](./profrance-ui-style-bible.md) · [`universal-prompt`](./profrance-universal-visual-prompt.md).
>
> Explicações em português. Prompts, recipes Tailwind e código em inglês.

---

## 1. What this kit is

Este kit transfere **apenas o sistema visual** ProFrance para outro projeto SaaS.

Transfere:
- Tokens de cor, tipografia, espaçamento.
- Padrões de card, botão, badge, dialog, form, lista.
- Hierarquia de dashboard (urgente → hoje → futuro → histórico).
- Regras mobile-first e motion.
- Filosofia premium de command center.

**NÃO transfere:**
- Dados de negócio (clientes, pedidos, valores, transações).
- Lógica de negócio (workflows, regras financeiras, automações).
- Regras de banco / Supabase (schema, queries, RLS, seeds).
- Workflows operacionais privados (estágios de produção, papéis, automações internas).
- Lógica de autenticação.

Resultado: outro produto ganha o **look & feel** ProFrance sem importar a lógica de domínio.

---

## 2. Quick visual summary

### 5 frases
1. SaaS administrativo/financeiro premium operacional com estética de command center calmo.
2. Navy `#002D72` é a única cor de marca de ação sobre cards brancos em fundo `#F7F8FC` quase plano.
3. Cards `rounded-2xl` com `ring-1 ring-black/5` e `shadow-sm` criam profundidade sem ruído; heros usam gradiente navy→roxo com orbs.
4. Status são sempre pills semânticos (emerald/amber/rose/blue/teal) pareados com texto — nunca cor sozinha.
5. Hierarquia tipo command center: urgente no topo, hoje em seguida, futuro depois, histórico embaixo; mobile-first com tabela virando card e touch ≥ 44px.

### 10 princípios visuais
1. Uma cor de marca: navy `#002D72` (hover `#003a94`).
2. Branco em superfície, `#F7F8FC` em página, navy escuro só na sidebar.
3. `rounded-2xl` + `ring-1 ring-black/5` + `shadow-sm` é o card padrão.
4. Hero/KPI = gradient `from-[#001F4D] via-[#002D72] to-[#2B1F5B]` + orbs translúcidos.
5. Accent rail top `h-[2px]` ou left `border-l-[5px]` por categoria/estágio.
6. Números sempre `tabular-nums`; currency bold navy à direita.
7. Status sempre pill semântico pareado com texto.
8. Labels de seção uppercase muted slate-400.
9. Sombras suaves; sem candy shadow, sem neon.
10. Hover lift só em elementos clicáveis.

### 10 princípios UX
1. Urgente no topo, histórico embaixo.
2. Uma ação primária por seção.
3. Empty states compactos com ícone bubble + frase curta.
4. Count badge em alertas pendentes (esconde se 0).
5. Cor semântica = significado fixo (emerald=ok, amber=atenção, rose=atraso, blue=info, teal=recorrente).
6. Mobile: tabela vira card stackado.
7. Touch target ≥ 44px.
8. Confirmar ações destrutivas.
9. Disabled explica com `title`.
10. Agrupar listas por semana/status/categoria — nunca CRUD cru.

---

## 3. Copy-ready design tokens

```css
:root {
  /* Brand */
  --brand-navy:        #002D72;  /* sole action color */
  --brand-navy-700:    #003a94;  /* hover */
  --brand-navy-deep:   #001F4D;  /* hero gradient start */
  --brand-navy-violet: #2B1F5B;  /* hero gradient end */
  --brand-blue:        #4F5FB8;
  --brand-violet:      #6D5FBF;
  --brand-violet-form: #81459E;  /* drawer form CTA */

  /* Surfaces */
  --surface:           #FFFFFF;
  --surface-elevated:  #FFFFFF;  /* lift via shadow, not color */
  --surface-muted:     #F1F3FA;
  --surface-page:      #F7F8FC;
  --surface-warm:      #F9F7EC;  /* finance row hover only */

  /* Borders */
  --border-soft:       rgba(15,23,42,0.07);
  --border-strong:     rgba(15,23,42,0.11);
  --ring-soft:         rgba(0,0,0,0.05);

  /* Text */
  --text-primary:      #0F172A;  /* slate-900 */
  --text-secondary:    #475569;  /* slate-600 */
  --text-muted:        #94A3B8;  /* slate-400 */
  --text-on-dark:      #FFFFFF;

  /* Semantic */
  --success:           #047857;  /* emerald-700 */
  --warning:           #B45309;  /* amber-700 */
  --danger:            #BE123C;  /* rose-700 */
  --info:              #1D4ED8;  /* blue-700 */
  --recurring:         #0F766E;  /* teal-700 */
  --logistics-orange:  #C2410C;  /* orange-700 */

  /* Radius / shadow / motion */
  --radius-sm: 0.5rem; --radius-md: 0.75rem; --radius-lg: 1rem;
  --radius-xl: 1.75rem; --radius-full: 9999px;
  --shadow-sm: 0 1px 2px rgba(15,23,42,0.05);
  --shadow-md: 0 8px 24px rgba(15,23,42,0.08);
  --shadow-card: 0 24px 80px rgba(15,23,42,0.08);
  --t-fast: 150ms; --t-base: 200ms; --t-slow: 300ms;
  --ease: cubic-bezier(0.16, 1, 0.3, 1);
}
```

| Token | Quando usar | Quando NÃO usar |
|-------|-------------|-----------------|
| `--brand-navy` | Botão primário, currency, tab ativa, ícone marca | Body, fundos grandes |
| `--brand-blue` | Ícones nav, chips info | Ação primária |
| `--brand-violet` | Form drawer CTA, badge violet | Substituir navy global |
| `--surface` | Cards, drawers, inputs | Fundo de página |
| `--surface-muted` | Input recolhido, skeleton | Card primário |
| `--surface-elevated` | Drawer/dialog | Confundir com card normal (diferencie via shadow) |
| `--border-soft` | Divisor padrão | Botão (use ring) |
| `--border-strong` | Header bottom de seção | Texto |
| `--text-primary` | Títulos, body | Texto muted |
| `--text-secondary` | Subtítulo, helper médio | Title |
| `--text-muted` | Uppercase label, hint | Texto principal |
| `--success` | Ativo/pago/ok | Aviso |
| `--warning` | Prazo próximo, atenção | Erro crítico |
| `--danger` | Atraso, erro, destruir | Primary |
| `--info` | Chip info, link | Sucesso |
| `--brand-violet-form` | Form primary opcional | Botão de tabela |
| `--logistics-orange` | Chip categoria logística | Status financeiro |

---

## 4. Tailwind starter system

### Page shell
**Purpose:** wrapper de topo de rota.
```html
class="min-h-screen bg-[#F7F8FC] p-4 sm:p-6 lg:p-8"
```
**Rule:** um por rota; filhos são `<section>` com `space-y-6`.

### Hero shell
**Purpose:** resumo executivo no topo do módulo.
```html
class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#001F4D] via-[#002D72] to-[#2B1F5B] p-6 text-white shadow-lg ring-1 ring-white/10"
```
**Rule:** máximo 1 por página; até 4 KPIs internos.

### Premium card
**Purpose:** container neutro padrão.
```html
class="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm ring-1 ring-black/5 transition-shadow duration-200 hover:shadow-md"
```
**Rule:** default. `hover:shadow-md` somente se clicável.

### KPI card
**Purpose:** métrica compacta.
```html
class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5 transition-all duration-200 hover:shadow-md"
```
**Rule:** dentro de grid 2/3/4/6 cols; número `tabular-nums` navy.

### Dashboard section
**Purpose:** bloco temático com header + count.
```html
class="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm"
```
+ accent rail: `<div class="absolute inset-x-0 top-0 h-[2px] bg-rose-400/70"></div>`
**Rule:** header com `border-b border-slate-100 px-5 py-4`; rail muda de cor por categoria.

### Section header
**Purpose:** título + tag + ação acima de bloco.
```html
class="flex flex-wrap items-center justify-between gap-3"
```
**Rule:** sempre `flex-wrap` para wrap no mobile.

### Action row
**Purpose:** linha de lista clicável.
```html
class="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50/60"
```
**Rule:** valor à direita bold navy; `min-w-0 truncate` no texto.

### Status badge
**Purpose:** pill semântico.
```html
class="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200"
```
**Rule:** sempre pareado com texto; troque o tom (`emerald|amber|rose|blue|teal|slate`).

### Warning banner
**Purpose:** aviso suave.
```html
class="flex items-start gap-3 rounded-xl border border-amber-200/60 bg-amber-50/70 px-4 py-3 ring-1 ring-amber-100 text-amber-700"
```
**Rule:** não bloqueante; banner full-bleed rose só em erro crítico.

### Primary button
**Purpose:** ação principal.
```html
class="inline-flex items-center justify-center rounded-[1.25rem] bg-[#002D72] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#003a94] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002D72]/30 active:translate-y-0 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
```
**Rule:** uma por seção.

### Secondary button
**Purpose:** ação de apoio.
```html
class="inline-flex items-center justify-center rounded-[1.25rem] border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 active:scale-[0.98]"
```
**Rule:** fica quieta visualmente.

### Ghost button
**Purpose:** link forte / navegação leve.
```html
class="inline-flex items-center justify-center rounded-[1.25rem] bg-transparent px-5 py-2.5 text-sm font-semibold text-[#002D72] transition-colors hover:bg-[#002D72]/10"
```
**Rule:** ações "ver mais", "voltar".

### Form input
**Purpose:** campo de formulário.
```html
class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base font-medium text-slate-900 outline-none transition-colors duration-150 hover:border-[#81459E]/40 focus:border-[#002D72] focus:ring-2 focus:ring-[#002D72]/10"
```
**Rule:** `text-base` impede zoom iOS; erro vira `border-rose-400`.

### Dialog shell
**Purpose:** confirmação modal.
```html
<!-- backdrop -->
class="fixed inset-0 z-30 grid place-items-center bg-slate-950/40 backdrop-blur-sm p-4"
<!-- card -->
class="w-full max-w-sm rounded-[1.75rem] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] ring-1 ring-black/5"
```
**Rule:** small confirm; para forms longos use drawer lateral `max-w-lg`.

### Empty state
**Purpose:** lista vazia.
```html
class="rounded-2xl bg-white py-14 text-center shadow-sm ring-1 ring-black/5"
```
**Rule:** icon bubble `h-14 w-14 rounded-2xl bg-slate-50`; mensagem curta.

### Progress bar
**Purpose:** progresso de tarefa.
```html
<!-- track --> class="h-2 w-full overflow-hidden rounded-full bg-slate-100"
<!-- fill -->  class="h-full rounded-full bg-[#002D72] transition-[width] duration-300"
```
**Rule:** fill navy; nunca gradiente.

### Mobile grid
**Purpose:** layout responsivo de cards.
```html
class="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
```
**Rule:** default coluna única; cresce em breakpoints maiores.

### Toast
**Purpose:** feedback de ação não-bloqueante.
```html
<!-- Container -->
class="fixed bottom-5 right-5 z-[100] flex max-w-sm flex-col items-end gap-2"
<!-- Success toast (rail + icon bubble) -->
class="flex w-full items-start gap-3 rounded-2xl border-l-4 border-emerald-500 bg-white px-4 py-3 shadow-lg ring-1 ring-black/5"
```
**Rule:** branco elevado + rail semântico (`emerald/rose/amber/blue/slate`). Nunca full-saturated bg. Mobile = `inset-x-4 bottom-4 flex-col`.

### Tooltip
**Purpose:** hint curto em ícone/botão.
```html
class="pointer-events-none absolute z-50 max-w-[200px] rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-white shadow-lg ring-1 ring-white/10"
```
**Rule:** `role="tooltip"`; delay 400ms hover, imediato em focus; mobile = tap 1.5s ou label inline.

### Popover
**Purpose:** conteúdo contextual rico.
```html
class="absolute z-40 w-72 rounded-2xl bg-white p-4 shadow-lg ring-1 ring-black/5"
```
**Rule:** header + body + footer; fecha em click outside / Esc / X; mobile = bottom sheet `rounded-t-[1.75rem]`.

### Sidebar shell
**Purpose:** navegação principal (único elemento dark do sistema).
```html
class="fixed inset-y-0 left-0 z-20 hidden w-[240px] flex-col border-r border-white/[0.08] shadow-[4px_0_36px_rgba(0,0,0,0.5)] bg-[radial-gradient(circle_at_90%_8%,rgba(255,255,255,0.06),transparent_22%),radial-gradient(circle_at_85%_30%,rgba(79,140,255,0.28),transparent_38%),radial-gradient(circle_at_92%_68%,rgba(147,51,234,0.26),transparent_40%),radial-gradient(circle_at_50%_92%,rgba(56,189,248,0.16),transparent_45%),radial-gradient(circle_at_10%_50%,rgba(37,99,235,0.14),transparent_42%),linear-gradient(150deg,#020b1f_0%,#031233_42%,#0a1228_100%)] lg:flex"
```
**Rule:** 5 radial + 1 linear navy; collapsed 72px; mobile = drawer com backdrop `bg-black/50 backdrop-blur-sm`.

### Sidebar active item
**Purpose:** item de nav selecionado.
```html
class="relative flex items-center gap-3 rounded-xl border border-white/[0.12] bg-white/[0.12] px-3 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(37,99,235,0.25)]"
```
+ accent bar esquerdo: `<span class="absolute inset-y-[6px] left-0 w-[3px] rounded-r-full bg-white/80"></span>`
**Rule:** ícone ativo `text-[#9cc2ff]`; inativo `text-white/55 hover:translate-x-[2px]`.

### Invalid input
**Purpose:** campo com erro de validação.
```html
class="w-full rounded-2xl border border-rose-400 bg-white px-4 py-3.5 text-base text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10"
```
+ `aria-invalid="true" aria-describedby="field-err"` + texto erro abaixo:
```html
<span id="field-err" class="flex items-center gap-1 text-xs font-medium text-rose-600">!  Error message</span>
```
**Rule:** só mostra após blur ou submit; nunca pré-interação.

### Form error banner
**Purpose:** erros server-side no topo do form.
```html
class="flex items-start gap-3 rounded-xl border border-rose-200/60 bg-rose-50/70 px-4 py-3 ring-1 ring-rose-100"
```
+ `role="alert"`; lista de erros `list-inside list-disc text-[12px] text-rose-700/80`.
**Rule:** topo do form; nunca esconder erro de submit no console.

### Chart container
**Purpose:** wrapper de gráfico (line/bar/area/donut).
```html
class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5"
```
+ header com KPI + legenda compacta `text-[11px] text-slate-500` + área `h-64`.
**Rule:** paleta token-aligned (`--chart-1..8`); minimal gridlines `rgba(15,23,42,0.05)`; **nunca somar moedas diferentes em um total**.

### Print-safe table
**Purpose:** tabela em documento imprimível.
```css
@media print {
  table { border-collapse: collapse; width: 100%; }
  thead { display: table-header-group; }
  tr    { page-break-inside: avoid; }
  th, td { padding: 6pt 8pt; border-bottom: 0.5pt solid #CBD5E1; }
  th { font-size: 9pt; text-transform: uppercase; color: #64748B; }
  td.amount { text-align: right; font-variant-numeric: tabular-nums; color: #002D72; font-weight: 700; }
}
```
**Rule:** thead repete em cada página; rows não quebram; currency navy bold à direita.

### Keyboard key badge
**Purpose:** indicar atalho.
```html
class="inline-flex h-5 min-w-[20px] items-center justify-center rounded-md border border-slate-200 bg-white px-1.5 text-[10px] font-semibold text-slate-600 shadow-[0_1px_0_rgba(15,23,42,0.06)]"
```
**Rule:** use `<kbd>` tag; combos `⌘ + K` em spans separados; mobile esconde.

---

## 5. Dashboard blueprint

```html
<main class="min-h-screen bg-[#F7F8FC] p-4 sm:p-6 lg:p-8">
  <div class="space-y-6">

    <!-- 1. Hero / command summary -->
    <section class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#001F4D] via-[#002D72] to-[#2B1F5B] p-6 text-white shadow-lg ring-1 ring-white/10">
      <p class="text-[11px] font-semibold uppercase tracking-widest text-white/60">Today</p>
      <h1 class="mt-1 text-3xl font-bold tracking-tight">Operational summary</h1>
      <div class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">…KPIs (≤4)…</div>
    </section>

    <!-- 2. Action required (hide if count===0) -->
    <section class="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
      <div class="absolute inset-x-0 top-0 h-[2px] bg-rose-400/70"></div>
      <header class="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
        <h2 class="text-lg font-bold text-slate-900">Action required</h2>
        <span class="rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-rose-600 ring-1 ring-rose-100">3</span>
      </header>
      <ul class="divide-y divide-slate-50">…rows…</ul>
    </section>

    <!-- 3. Today (blue rail) -->
    <section class="…">…</section>

    <!-- 4. Next 24h (amber rail; date chips amber if ≤2 days) -->
    <section class="…">…</section>

    <!-- 5. Secondary insights (slate rail; charts, averages, history) -->
    <section class="…">…</section>
  </div>
</main>
```

### O que vai em cada seção
- **Hero:** resumo do dia + 2–4 KPIs ancoradores (Pedidos hoje, Faturamento, Atrasos, Pendências). Sem gráfico complexo.
- **Action required:** apenas itens que exigem decisão humana hoje. Count badge é obrigatório. Esconda a seção inteira se `count === 0`.
- **Today:** atividade recente (pedidos do dia, transações, entregas concluídas), com `divide-y divide-slate-50`.
- **Next 24h:** prazos próximos com `DeliveryDateChip` âmbar quando ≤ 2 dias.
- **Secondary insights:** médias, comparativos semanais, lista de top clientes, charts. Tudo que pode esperar.

### Evitar
- **Number overload:** máx 4 KPIs no hero. Mais? quebre em compact cards abaixo.
- **Seções duplicadas:** "Latest orders" + "Today's orders" iguais é redundância. Renomeie ou consolide.
- **Urgência alarmista:** rose só em count + accent rail; nunca pinte card inteiro de vermelho.
- **Decoração competindo com ação:** botões e alertas vêm antes de gráficos.
- **Configuração no dashboard:** dashboard não é tela de cadastro. Mova para módulo dedicado.

### Como soar operacional e não decorativo
- Cada KPI tem unidade clara (€, %, contagem) com `tabular-nums`.
- Cada lista mostra o "próximo passo" — link "Open →" no fim da row.
- Empty state diz "Tudo em dia" em vez de só "Sem dados".
- Cores semânticas (rose/amber/emerald) refletem estado real, não decoração.

---

## 6. Component rules

| Componente | Visual rule | UX rule | Tailwind direction | Mistake to avoid |
|------------|-------------|---------|--------------------|--------------------|
| **Cards** | `rounded-2xl` + `ring-1 ring-black/5` + `shadow-sm` branco | Branco primeiro; cor só em hero/icon bubble | `bg-white shadow-sm ring-1 ring-black/5` | Cards pastel sólidos, candy shadow |
| **Buttons** | Primary navy, secondary outline, ghost transparente | Uma primary por seção | `bg-[#002D72] hover:-translate-y-0.5 active:scale-[0.98]` | Múltiplas primaries competindo, full-red destrutivo |
| **Badges** | Pill `rounded-full` `bg-{tone}-50 text-{tone}-700 ring-1 ring-{tone}-200` | Sempre pareado com texto | `text-[10px]/[11px] font-semibold` | Cor sozinha como status; uppercase em badge |
| **Rows** | `px-5 py-3.5` + `hover:bg-slate-50/60` | Valor à direita bold navy `tabular-nums` | `divide-y divide-slate-50` | Listras zebra; bordas pesadas |
| **Dialogs** | `rounded-[1.75rem]` `max-w-sm` para confirm | Pequeno = confirm; drawer = forms longos | Backdrop `bg-slate-950/40 backdrop-blur-sm` | Dialog gigante para 1 pergunta |
| **Forms** | Inputs `rounded-2xl` com focus duplo navy | Label semibold acima; erro abaixo | `focus:border-[#002D72] focus:ring-2 focus:ring-[#002D72]/10` | Inputs `text-sm` que causam zoom iOS |
| **Empty states** | Compact `py-14` centrado, icon bubble | Frase curta; sugerir próxima ação | `bg-slate-50 ring-1 ring-black/5` | Buracos verticais gigantes |
| **Alerts** | `bg-{tone}-50/70 ring-1 ring-{tone}-100` | Banner não-bloqueante; ícone + título + helper | `rounded-xl border border-{tone}-200/60` | Banner full-bleed vermelho saturado |
| **KPI blocks** | Número `text-2xl/3xl font-bold tabular-nums` | Label uppercase muted acima | `text-[#002D72]` no compact; branco no hero | Esconder unidade; números sem `tabular-nums` |
| **Progress bars** | Track `bg-slate-100 rounded-full h-2`, fill navy | Animar com `transition-[width] duration-300` | `h-2 overflow-hidden rounded-full` | Gradient no fill; altura > 4 |
| **Mobile lists** | Tabela → cards stackados | `block md:hidden` cards / `hidden md:block` table | `px-4 py-3.5` + `divide-y divide-slate-50` | Tabela com scroll horizontal no mobile |

---

## 7. Mobile-first checklist

### 375 / 390 px
- [ ] `document.documentElement.scrollWidth === clientWidth` (zero overflow horizontal).
- [ ] Sidebar é drawer com backdrop blur.
- [ ] Topbar `sticky top-0 z-20` + safe-area top.
- [ ] Cards em coluna única (`grid-cols-1`).
- [ ] KPI values legíveis (`text-2xl` mínimo).
- [ ] Section headers `flex flex-wrap items-center justify-between gap-3`.
- [ ] Botões primários full-width (`w-full sm:w-auto`).
- [ ] Touch targets ≥ 44px (use `.touch-target` ou `min-h-[44px]`).
- [ ] Tabelas convertem para cards (`hidden md:table` + `block md:hidden`).
- [ ] Dialogs `max-h-[60vh] overflow-y-auto`.
- [ ] Inputs `text-base` (impede zoom iOS).
- [ ] `min-w-0 truncate` em flex children com texto.
- [ ] `break-all` em email/telefone.
- [ ] Safe-area bottom respeitada (PWA).
- [ ] Sem giant pastel blocks ocupando viewport inteira.

### Tablet (768 px)
- [ ] Grids 2 colunas.
- [ ] Filtros 2×2.
- [ ] Sidebar drawer ou recolhida.

---

## 8. Do and Don't rules

### 20 Do
1. Use navy `#002D72` como única cor de marca de ação.
2. Cards `rounded-2xl bg-white shadow-sm ring-1 ring-black/5`.
3. Hero gradient navy→violet + orbs.
4. Status sempre pill semântico.
5. Currency `tabular-nums` bold navy à direita.
6. Empty state compact com icon bubble.
7. Count badge em alert (esconda se 0).
8. Accent rail por categoria/estágio.
9. Icon bubble `bg-{tone}-50 ring-1 ring-{tone}-100`.
10. Hover lift só em clicáveis.
11. Focus ring duplo em inputs (`focus:border + focus:ring-2`).
12. Mobile: tabela → card.
13. Touch ≥ 44px.
14. Inputs `text-base` (anti-zoom iOS).
15. Skeleton ao invés de spinner.
16. Drawer lateral para forms longos.
17. Section header `flex-wrap`.
18. Sidebar dark + conteúdo claro.
19. Topbar `backdrop-blur-xl sticky`.
20. Confirmar ações destrutivas.

### 20 Don't
1. Não use cards pastel sólidos.
2. Não use neon/saturação alta.
3. Não use `shadow-2xl` em lista comum.
4. Não misture radius sem critério.
5. Não comunique status só por cor.
6. Não coloque form no dashboard.
7. Não mostre tabela crua no mobile.
8. Não use bounce animations.
9. Não dê hover lift em card não-clicável.
10. Não use 2+ botões primary na mesma área.
11. Não pinte destrutivo full-red.
12. Não escreva número sem `tabular-nums`.
13. Não use uppercase em badges.
14. Não use `text-sm` em input mobile (causa zoom iOS).
15. Não duplique seções no dashboard.
16. Não exceda 4 KPIs no hero.
17. Não esconda dado útil ao "limpar".
18. Não use sidebar clara sem contraste.
19. Não use gradient em card de lista.
20. Não use linhas divisórias pesadas.

---

## 9. Implementation plan for another system

### Phase 1 — Visual audit do alvo
- **Goal:** mapear o estado atual e identificar gaps.
- **Files:** `tailwind.config.*`, `globals.css`, layout principal, página típica (dashboard/lista/form).
- **Constraints:** read-only; nada de editar ainda.
- **Output:** relatório curto com bullets — cores em uso, radius, sombras, hierarquia, problemas mobile.

### Phase 2 — Tokens + base surfaces
- **Goal:** instalar tokens CSS e base do shell.
- **Files:** `globals.css` / `app.css`, `tailwind.config.*` (extend), `RootLayout`/`AppShell`.
- **Constraints:** sem adicionar dependências; sem dark mode.
- **Output:** `:root` com tokens da §3; body com fundo `#F7F8FC`; sidebar/topbar com classes-base.

### Phase 3 — Convert cards/buttons/badges
- **Goal:** padronizar componentes compartilhados.
- **Files:** `components/ui/*`, `Card`, `Button`, `Badge`, `Input`.
- **Constraints:** preservar props/APIs existentes; só trocar classes.
- **Output:** componentes usando recipes da §4; documentação curta no Storybook se existir.

### Phase 4 — Reorganize dashboard hierarchy
- **Goal:** aplicar hierarquia urgente → hoje → futuro → histórico.
- **Files:** `Dashboard`/`Home` + componentes-filhos.
- **Constraints:** sem alterar queries de dados; só reordenar/reagrupar.
- **Output:** dashboard com 5 seções da §5; count badges; accent rails; hero com ≤ 4 KPIs.

### Phase 5 — Polish forms/dialogs/mobile
- **Goal:** inputs/dialogs premium + responsividade.
- **Files:** `forms/*`, `dialogs/*`, breakpoints em páginas-chave.
- **Constraints:** zero schema/validação alterada; só apresentação.
- **Output:** drawer lateral para forms longos; dialog `max-w-sm`; QA mobile 375/390.

### Phase 6 — QA desktop/mobile
- **Goal:** verificar regressões e finalizar.
- **Files:** rodar `tsc --noEmit`, `npm run build`, testes E2E se existirem.
- **Constraints:** zero hot-fix de lógica.
- **Output:** checklist §12 preenchido; screenshots desktop + mobile; lista de gaps remanescentes.

---

## 10. Universal AI prompt

```text
ROLE
You are a Senior Frontend Engineer, UI Architect, Premium SaaS Product Designer, Design System Architect, and Mobile-first UX Designer.

MISSION
Apply the "ProFrance" premium operational SaaS visual style to this project. Visual-only. Preserve architecture. Minimal diff. Incremental.

PRIVACY (HARD RULE)
Do not copy ProFrance business data or business logic. Copy only the visual system, interaction style, layout philosophy, and premium SaaS UI patterns.

VISUAL IDENTITY
- Premium, executive, calm, trustworthy, mobile-first, operational command-center feel.
- Inspirations: Stripe, Linear, Apple/HIG, Notion, Revolut, Raycast.
- White elevated surfaces on near-flat page #F7F8FC.
- Single brand action color: navy #002D72 (hover #003a94).
- Hero gradient: from-[#001F4D] via-[#002D72] to-[#2B1F5B] + translucent orbs.
- Semantic pills: emerald=ok, amber=warning, rose=danger, blue=info, teal=recurring.
- No neon. No solid pastel cards. No candy shadows. No bounce. No heavy glass beyond topbar backdrop-blur.

ARCHITECTURE CONSTRAINTS
- Preserve target routes, data fetching, schema, auth, business logic.
- Modify only UI/styling files.
- Do not add dependencies unless explicitly approved.
- Prefer minimal diff. Apply changes incrementally: tokens → shell → cards → dashboard → forms → mobile QA.
- Run TypeScript check and build after each phase.

COLOR TOKENS (add to :root)
--brand-navy: #002D72; --brand-navy-700: #003a94;
--brand-blue: #4F5FB8; --brand-violet: #6D5FBF; --brand-violet-form: #81459E;
--surface: #FFFFFF; --surface-elevated: #FFFFFF;
--surface-muted: #F1F3FA; --surface-page: #F7F8FC; --surface-warm: #F9F7EC;
--border-soft: rgba(15,23,42,0.07); --border-strong: rgba(15,23,42,0.11);
--text-primary: #0F172A; --text-secondary: #475569; --text-muted: #94A3B8;
--success: #047857; --warning: #B45309; --danger: #BE123C; --info: #1D4ED8;
--recurring: #0F766E; --logistics-orange: #C2410C;

TYPOGRAPHY
- Geist / Inter / Manrope / system-ui acceptable.
- Page title: text-3xl font-semibold tracking-tight text-[#002D72].
- Section header: text-lg font-bold text-slate-900.
- Muted label: text-[11px] font-semibold uppercase tracking-wide text-slate-400.
- Body: text-sm text-slate-700. Helper: text-[12px] text-slate-500.
- All numbers tabular-nums. Currency bold navy, right-aligned.

COMPONENT SYSTEM (Tailwind recipes)
- Page shell: min-h-screen bg-[#F7F8FC] p-4 sm:p-6 lg:p-8.
- Premium card: rounded-2xl bg-white shadow-sm ring-1 ring-black/5; hover:shadow-md only if clickable.
- KPI card: rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5.
- Hero card: rounded-2xl bg-gradient-to-br from-[#001F4D] via-[#002D72] to-[#2B1F5B] p-6 text-white shadow-lg ring-1 ring-white/10.
- Accent rail (category): absolute inset-x-0 top-0 h-[2px] bg-{tone}-400/70.
- Accent rail (stage): border-l-[5px] border-{tone}-400.
- Icon bubble: flex h-10 w-10 items-center justify-center rounded-xl bg-{tone}-50 ring-1 ring-{tone}-100.
- Primary button: rounded-[1.25rem] bg-[#002D72] px-5 py-2.5 text-sm font-semibold text-white hover:-translate-y-0.5 hover:bg-[#003a94] focus-visible:ring-2 focus-visible:ring-[#002D72]/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed.
- Secondary: border border-slate-200 bg-white text-slate-700 hover:bg-slate-50.
- Ghost: bg-transparent text-[#002D72] hover:bg-[#002D72]/10.
- Destructive (icon): h-7 w-7 rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-500. Never full-red bg.
- Status badge: rounded-full bg-{tone}-50 px-2.5 py-0.5 text-[11px] font-semibold text-{tone}-700 ring-1 ring-{tone}-200.
- Warning banner: rounded-xl border border-amber-200/60 bg-amber-50/70 px-4 py-3 ring-1 ring-amber-100 text-amber-700.
- Form input: w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base focus:border-[#002D72] focus:ring-2 focus:ring-[#002D72]/10.
- Dialog shell: fixed inset-0 z-30 grid place-items-center bg-slate-950/40 backdrop-blur-sm p-4. Card: w-full max-w-sm rounded-[1.75rem] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] ring-1 ring-black/5.
- Side drawer (long forms): fixed inset-y-0 right-0 z-40 w-full max-w-lg bg-white shadow-2xl with sticky footer.
- Action row: flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-slate-50/60.
- Empty state: rounded-2xl bg-white py-14 text-center shadow-sm ring-1 ring-black/5; icon bubble h-14 w-14 rounded-2xl bg-slate-50.
- Progress bar: track h-2 w-full rounded-full bg-slate-100; fill h-full rounded-full bg-[#002D72].

DASHBOARD HIERARCHY
1. Hero / command summary (≤4 KPIs, navy gradient).
2. Action required (rose rail + count badge; hide if 0).
3. Today / current activity (blue rail).
4. Next 24h / upcoming (amber rail; date chips amber if ≤2 days).
5. Secondary insights (slate rail).

MOBILE RULES
- Safe at 375 and 390px. No horizontal overflow (verify scrollWidth === clientWidth).
- grid-cols-1 default → sm:/md:/xl: breakpoints.
- Tables convert to stacked cards (hidden md:table + block md:hidden).
- Touch targets ≥ 44px. Buttons full-width on primary actions.
- Dialog: max-h-[60vh] + overflow-y-auto + safe-area bottom.
- Inputs text-base to prevent iOS zoom.
- Section headers flex-wrap gap-3.
- Sidebar becomes drawer with bg-black/50 backdrop-blur-sm.

MOTION
- transition-all duration-200 ease-out base.
- Hover lift hover:-translate-y-0.5 hover:shadow-md only on clickable cards.
- active:scale-[0.98] tactile feedback.
- Skeleton (animate-pulse rounded-2xl bg-slate-100 ring-1 ring-black/5) over spinners.
- No bounce. No neon. No heavy glass beyond topbar backdrop-blur-xl.

ADVANCED VISUAL SYSTEMS
- Toast: white elevated + border-l-4 semantic rail (emerald/rose/amber/blue/slate) + icon bubble + rounded-2xl shadow-lg ring-1 ring-black/5. NEVER full-saturated bg. Container fixed bottom-5 right-5 z-[100] aria-live="polite". Mobile = inset-x-4 bottom-4 flex-col. Duration: success/info 3500ms, warning 5000ms, error 6000ms, loading/persistent no auto-dismiss.
- Dark mode: NOT implemented now. Light is canonical. Prepare shadow tokens (--surface-dark, --surface-elevated-dark, --text-primary-dark, --border-soft-dark) for future. Print always forces light via @media print { :root { color-scheme: light } }.
- Z-index scale: z-0 content / z-10 sticky / z-20 sidebar+topbar / z-30 dropdown / z-40 popover / z-50 tooltip / z-[60] modal backdrop / z-[70] modal / z-[80] drawer / z-[90] command menu / z-[100] toast / z-[9999] debug. Dropdown < modal; tooltip > dropdown < modal; toast > most except critical modal (which can rise to z-[110] ad-hoc).
- Sidebar gradient: 5 radial accents over linear navy base. Single dark surface in the system. Active item border-white/[0.12] bg-white/[0.12] + left accent bar 3px white/80 + icon #9cc2ff. Inactive text-white/55 with hover:translate-x-[2px]. Mobile = drawer + bg-black/50 backdrop-blur-sm.
- Form errors: validate ON BLUR; submit revalidates. Required label has rose asterisk *. Invalid input border-rose-400 + aria-invalid + helper text-xs text-rose-600. Server errors in banner border-rose-200/60 bg-rose-50/70 ring-rose-100 at form top. Loading submit keeps label "Saving…" + spinner — never disappears.
- Tooltip: role="tooltip" max-w-[200px] z-50; dark bg-slate-900 text-white text-[11px] OR light variant bg-white ring-1. Delay 400ms hover, immediate on focus. Mobile = tap 1.5s or inline label.
- Popover: role="dialog" aria-modal="false" rounded-2xl bg-white shadow-lg ring-1 ring-black/5 z-40. Header + body + footer. Close on outside click / Esc / X button. Mobile = bottom sheet rounded-t-[1.75rem].
- Charts: token-aligned palette (--chart-1=#002D72, --chart-2=#4F5FB8, --chart-3=#047857, --chart-4=#B45309, --chart-5=#BE123C, --chart-6=#0F766E, --chart-7=#6D5FBF, --chart-8=#94A3B8). Minimal gridlines rgba(15,23,42,0.05). NEVER sum different currencies into one visual total — group by currency. No rainbow, no 3D, no heavy gradient except subtle area fill (12% opacity). All numbers tabular-nums.
- Print/PDF: @page A4 margin 20mm. Hide .sidebar-shell, .topbar, .toast-container, .no-print. Strip box-shadow, text-shadow, background-image. Status badges flatten (bg-{tone}-50 + ring-1 border). thead repeats per page. page-break-inside: avoid on rows + signatures. Logo monochrome preferred. Mobile shows amber banner: "For best results, print from desktop."
- Keyboard shortcuts: ⌘K command menu, / focus search, ⌘S save, Esc close overlay, Enter confirm primary, ? help overlay, ↑↓ navigate, g+d/p/f/c route shortcuts. Visual <kbd> badge: rounded-md border-slate-200 bg-white text-[10px] font-semibold shadow-[0_1px_0_rgba(15,23,42,0.06)]. Skip global shortcuts when focus is in input/textarea/contenteditable. Esc ALWAYS closes overlays.

FORBIDDEN ACTIONS
- No business logic / data fetching / schema / auth / route changes.
- No new dependencies without explicit approval.
- No dark mode unless requested.
- No unrelated refactor.
- No build/lint/test config changes.
- No committing secrets, .env, or API keys.
- No disabling tests or hooks to pass build.

OUTPUT FORMAT
Return in this exact structure:
1. Visual audit: bullet list of current target pain points.
2. Files to modify: grouped by concern (tokens / shell / cards / dashboard / forms / mobile).
3. Visual changes proposed: concise per-file description.
4. Phased implementation plan: ordered phases with QA gates between them.
5. Confirmation: "No business logic, data fetching, schema, auth, or routes were changed."
6. QA checklist: desktop + tablet + mobile 375/390 + accessibility + integrity (tsc, build, lint).

Now begin with step 1 (visual audit) and wait for approval before modifying any file.
```

---

## 11. Micro prompt for one file

```text
Apply ProFrance premium SaaS visual style to THIS FILE ONLY.

Scope: <path/to/component-or-page>
- Modify only this file.
- Preserve architecture, props, data fetching, routes, business logic.
- Visual-only. No data logic changes. No schema changes.
- Minimal diff.

PRIVACY: Do not copy ProFrance business data or business logic. Copy only visual patterns.

Rules:
- White cards on #F7F8FC. Navy #002D72 = sole action color (hover #003a94).
- rounded-2xl bg-white shadow-sm ring-1 ring-black/5 default. Hover lift only if clickable.
- Semantic pills (emerald/amber/rose/blue/teal) ring-1, never raw colored text.
- Numbers tabular-nums; currency bold navy right-aligned.
- Muted label: text-[11px] font-semibold uppercase tracking-wide text-slate-400.
- One primary button per area (navy). Secondary outline. Ghost text-navy.
- Mobile-first: grid-cols-1 default; tables → stacked cards; touch ≥44px; inputs text-base.
- No neon, no bounce, no candy shadow, no solid pastel cards, no full-red destructive.
- Empty state: compact py-14 with icon bubble bg-slate-50 ring-1 ring-black/5.
- Form input: rounded-2xl border-slate-200 focus:border-[#002D72] focus:ring-2 focus:ring-[#002D72]/10.

Output:
1. Brief diff summary (what changed and why).
2. Confirmation no logic/schema/routes were changed.
3. Spot-check mobile 375px in mind.
```

---

## 12. QA checklist after applying the style

### Build integrity
- [ ] `tsc --noEmit` passa sem novos erros.
- [ ] `npm run build` (ou `pnpm/yarn build`) passa.
- [ ] Lint não regrediu.
- [ ] Sem warnings de hidratação no console.

### Desktop visual
- [ ] Page title navy `text-3xl font-semibold`.
- [ ] Cards `rounded-2xl ring-1 ring-black/5 shadow-sm`.
- [ ] Hero gradient navy→violet + orbs.
- [ ] Sidebar dark; conteúdo claro.
- [ ] Topbar `sticky backdrop-blur-xl`.
- [ ] Status sempre pill semântico.
- [ ] Currency `tabular-nums` bold navy.
- [ ] Hover lift apenas em clicáveis.

### Mobile 375 / 390 px
- [ ] `scrollWidth === clientWidth` (zero overflow).
- [ ] Tabela vira card stackado.
- [ ] Touch targets ≥ 44px.
- [ ] Dialog `max-h-[60vh]` + scroll interno.
- [ ] Section headers wrap.
- [ ] Inputs `text-base`.
- [ ] Safe-area bottom respeitada.

### Acessibilidade
- [ ] Contraste WCAG AA em texto sobre superfície.
- [ ] Cor NÃO é único sinal de status (sempre tem texto/ícone).
- [ ] `focus-visible:ring-2` em todos botões/links/inputs.
- [ ] Labels associadas a inputs.
- [ ] Ícones decorativos com `aria-hidden`.

### Estados
- [ ] Empty state compacto com icon bubble.
- [ ] Loading com skeleton (`animate-pulse`).
- [ ] Error banner rose/amber, nunca full-bleed vermelho.
- [ ] Disabled com `opacity-50 cursor-not-allowed` + `title`.

### Integridade do alvo (CRÍTICO)
- [ ] Nenhuma rota renomeada.
- [ ] Nenhuma query/fetch alterada.
- [ ] Nenhuma migration nova.
- [ ] Nenhum schema Supabase alterado.
- [ ] Nenhuma dependência adicionada sem aprovação.
- [ ] Zero dado privado ProFrance copiado.
- [ ] Zero lógica de negócio ProFrance importada.

### Toast visual QA
- [ ] Toast usa superfície branca elevada + rail semântico (`border-l-4`).
- [ ] Ícone bubble com tom suave (`bg-{tone}-50 ring-1`).
- [ ] Container `z-[100]` bottom-right desktop / inset-x bottom mobile.
- [ ] Container tem `aria-live="polite"`; toast individual `role="status"` (success/info) ou `role="alert"` (error).
- [ ] Esc dispensa topo da pilha; máx 5 visíveis.
- [ ] Duration: success 3500ms, warning 5000ms, error 6000ms, loading sem auto-dismiss.

### Z-index collision QA
- [ ] Dropdown nunca aparece acima de modal.
- [ ] Tooltip acima de dropdown, abaixo de modal.
- [ ] Toast acima de quase tudo MAS modal crítico sobe para z-[110] ad-hoc se precisar.
- [ ] Command menu acima de drawer, abaixo de toast.
- [ ] Debug overlay só em dev mode (`z-[9999]`).

### Sidebar visual QA
- [ ] Gradient stack 5 radial + 1 linear navy presente.
- [ ] Item ativo: borda branca translúcida + accent bar esquerda 3px + glow azulado.
- [ ] Ícone ativo `#9cc2ff`; inativo `text-white/55`.
- [ ] Hover desliza `translate-x-[2px]`.
- [ ] Mobile drawer com backdrop `bg-black/50 backdrop-blur-sm`.
- [ ] Footer respeita safe-area iOS (`sidebar-bottom`).

### Form error QA
- [ ] Erro só aparece após blur OU submit (não pré-interação).
- [ ] Asterisco rose `*` em label de required.
- [ ] Submit revalida tudo.
- [ ] Server errors em banner topo do form `bg-rose-50/70 ring-rose-100`.
- [ ] Mensagem inline `text-xs text-rose-600` com ícone `h-3 w-3`.
- [ ] `aria-invalid="true" aria-describedby="…-err"` em inputs inválidos.
- [ ] Submit loading mantém label "Saving…" + spinner — nunca desaparece.

### Tooltip / popover QA
- [ ] Tooltip `role="tooltip"` + `aria-describedby` no âncora.
- [ ] Tooltip max-w-[200px], delay 400ms hover, imediato em focus.
- [ ] Esc fecha tooltip e popover.
- [ ] Popover `z-40`; tooltip `z-50`; nunca acima de modal.
- [ ] Mobile: tooltip vira label inline ou tap 1.5s; popover vira bottom sheet.
- [ ] Click outside fecha popover.

### Chart QA
- [ ] Paleta usa tokens `--chart-1..8`.
- [ ] Gridlines minimalistas `rgba(15,23,42,0.05)`.
- [ ] Tooltip do chart usa estilo white-elevated.
- [ ] Legenda compacta abaixo de KPI principal.
- [ ] Números `tabular-nums`.
- [ ] Empty state com icon bubble + frase curta.
- [ ] **NUNCA soma moedas diferentes em um total único** — agrupar por moeda.
- [ ] Sem rainbow, 3D, ou heavy gradient (só area fill 12% opacity).

### Print / PDF QA
- [ ] `@page` A4 com margens 20mm (15mm se denso).
- [ ] Sidebar, topbar, toast container, `.no-print` ocultos.
- [ ] `box-shadow`, `text-shadow`, `background-image` removidos.
- [ ] Status badges flatten para fundo claro + texto escuro + border.
- [ ] thead repete em cada página (`display: table-header-group`).
- [ ] `page-break-inside: avoid` em rows e signature block.
- [ ] Logo monocromático preferível.
- [ ] Mobile mostra banner amber: "For best results, print from desktop."

### Keyboard shortcut QA
- [ ] Atalhos globais ignorados quando focus em `<input>`, `<textarea>`, `contenteditable`.
- [ ] Esc sempre fecha overlay aberto.
- [ ] Sequências (`g d`) com delay máx 1.5s entre teclas.
- [ ] Tooltip de botão mostra `<kbd>` correspondente.
- [ ] `?` abre help overlay listando todos os shortcuts.
- [ ] Help overlay esconde no mobile (`< md`).
- [ ] Toast anuncia ação executada via shortcut.

---

## 13. Advanced Visual Systems

Esta seção fecha os sistemas avançados que distinguem o ProFrance de um SaaS comum. Cada subseção pode ser implementada independente.

### 13.1 Toast / notification system

**Estado atual:** App tem `ToastProvider` com API `useToast().showToast(msg, "success"|"error")`. Estilo atual é full saturated (`bg-emerald-600`/`bg-rose-600`) — **divergente do tom calmo**.

**Recomendação:** migrar visual para superfície branca elevada + rail/icon semântico. Manter API; estender depois para `warning|info|loading|persistent`.

**Visual direction:** white elevated + rail `border-l-4` + icon bubble + `rounded-2xl shadow-lg ring-1 ring-black/5`. Sem full-red. Sem neon.

```html
<!-- Container -->
<div aria-live="polite" class="fixed bottom-5 right-5 z-[100] flex max-w-sm flex-col items-end gap-2">…</div>

<!-- Success -->
<div role="status" class="flex w-full items-start gap-3 rounded-2xl border-l-4 border-emerald-500 bg-white px-4 py-3 shadow-lg ring-1 ring-black/5">
  <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">✓</span>
  <div class="min-w-0 flex-1">
    <p class="text-sm font-semibold text-slate-900">Saved</p>
    <p class="mt-0.5 text-[12px] text-slate-500">Optional helper.</p>
  </div>
  <button aria-label="Dismiss" class="ml-1 rounded-md p-1 text-slate-400 hover:bg-slate-50">✕</button>
</div>

<!-- Variants — same shell, swap rail+icon+ARIA -->
<!-- Error:   border-rose-500   + bg-rose-50/text-rose-600/ring-rose-100     + role="alert" -->
<!-- Warning: border-amber-500  + bg-amber-50/text-amber-600/ring-amber-100  + role="status" -->
<!-- Info:    border-blue-500   + bg-blue-50/text-blue-600/ring-blue-100     + role="status" -->
<!-- Loading: border-slate-300  + bg-slate-50/text-slate-500/ring-slate-100 + spinner; no auto-dismiss -->
<!-- Persistent action: include CTA button (Undo); no auto-dismiss -->
```

**Behavior:**
- Position: `bottom-5 right-5` desktop; `inset-x-4 bottom-4 flex-col` mobile.
- Stack: novas no topo; máx 5 visíveis; antigas fade out.
- Duration: success/info 3500ms; warning 5000ms; error 6000ms; loading/persistent sem auto-dismiss.
- Close: sempre presente para error/warning/persistent; opcional para success/info.
- A11y: container `aria-live="polite"`; toast individual `role="status"` ou `role="alert"`; Esc dispensa topo.

### 13.2 Dark mode decision

**Decisão atual: NÃO implementar dark mode agora.**

Razões:
- Light mode ainda tem inconsistências (`--uno-success` vs `emerald-700`, radius misturado).
- Dark duplica QA em todos os módulos.
- Charts/print/PDF precisam de tratamento próprio (print sempre força light).
- Demanda do usuário não documentada.

**Estratégia:** estabilizar light, preparar shadow tokens dark-friendly, esperar demanda.

**Tokens-shadow (não usar ainda):**
```css
:root {
  /* Future dark theme — documented only, not active */
  --surface-dark:          #0B1220;
  --surface-elevated-dark: #111A2E;
  --surface-muted-dark:    #1A2438;
  --text-primary-dark:     #F1F5F9;
  --text-secondary-dark:   #CBD5E1;
  --text-muted-dark:       #94A3B8;
  --border-soft-dark:      rgba(255,255,255,0.07);
  --border-strong-dark:    rgba(255,255,255,0.11);
  --brand-navy-dark:       #5B82C9; /* lighter for dark contrast */
}
```

**Hard rule for now:** sem `dark:` modifiers Tailwind, sem `prefers-color-scheme` listeners, sem toggle, sem `theme` provider. Print força light fixo via `@media print { :root { color-scheme: light; } }`.

### 13.3 Z-index scale

```css
:root {
  --z-base:           0;   /* default content */
  --z-sticky:         10;  /* sticky table headers, sticky form footers */
  --z-sidebar:        20;  /* topbar + sidebar foundation */
  --z-dropdown:       30;  /* select dropdown, combobox menu */
  --z-popover:        40;  /* popover panels */
  --z-tooltip:        50;  /* tooltip bubbles */
  --z-modal-backdrop: 60;
  --z-modal:          70;
  --z-drawer:         80;
  --z-command-menu:   90;  /* cmd+k palette */
  --z-toast:          100;
  --z-debug:          9999;
}
```

| Camada | Tailwind |
|--------|----------|
| Base content | `z-0` |
| Sticky | `z-10` |
| Sidebar/topbar | `z-20` |
| Dropdown | `z-30` |
| Popover | `z-40` |
| Tooltip | `z-50` |
| Modal backdrop | `z-[60]` |
| Modal/dialog | `z-[70]` |
| Drawer | `z-[80]` |
| Command menu | `z-[90]` |
| Toast | `z-[100]` |
| Debug overlay | `z-[9999]` |

**Collision rules:**
- Dropdown NUNCA acima de modal — modal abrindo fecha dropdowns.
- Tooltip acima de dropdown, abaixo de modal — não bloqueia foco.
- Toast acima de quase tudo, MAS modal crítico sobe a `z-[110]` ad-hoc OU toast suprime nessa janela.
- Command menu acima de drawer, abaixo de toast.
- Debug overlay (`z-[9999]`) só dev mode.

**Gotchas:** iframes Stripe/Plaid podem subir; iOS Safari soma stacking com `transform` — use `fixed` + z controlado.

### 13.4 Sidebar gradient stack

Stack real extraído de `src/components/layout/Sidebar.tsx`: 5 radial + 1 linear navy.

```css
.sidebar-shell {
  background:
    radial-gradient(circle at 90% 8%,   rgba(255,255,255,0.06), transparent 22%),
    radial-gradient(circle at 85% 30%,  rgba(79,140,255,0.28),  transparent 38%),
    radial-gradient(circle at 92% 68%,  rgba(147,51,234,0.26),  transparent 40%),
    radial-gradient(circle at 50% 92%,  rgba(56,189,248,0.16),  transparent 45%),
    radial-gradient(circle at 10% 50%,  rgba(37,99,235,0.14),   transparent 42%),
    linear-gradient(150deg, #020b1f 0%, #031233 42%, #0a1228 100%);
  border-right: 1px solid rgba(255,255,255,0.08);
  box-shadow: 4px 0 36px rgba(0,0,0,0.5);
}
```

```html
<!-- Shell desktop -->
<aside class="sidebar-shell fixed inset-y-0 left-0 z-20 hidden w-[240px] flex-col lg:flex">

<!-- Brand block -->
<div class="flex h-[58px] items-center gap-3 border-b border-white/[0.08] px-4">
  <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#001122] to-[#002244] shadow-lg ring-1 ring-blue-400/30">…</span>
  <p class="text-[16px] font-bold text-white">App</p>
</div>

<!-- Active item -->
<a class="relative flex items-center gap-3 rounded-xl border border-white/[0.12] bg-white/[0.12] px-3 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(37,99,235,0.25)]">
  <span class="absolute inset-y-[6px] left-0 w-[3px] rounded-r-full bg-white/80"></span>
  <svg class="h-4 w-4 text-[#9cc2ff]">…</svg> Item
</a>

<!-- Inactive item -->
<a class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/75 transition-all hover:translate-x-[2px] hover:bg-white/[0.08] hover:text-white">
  <svg class="h-4 w-4 text-white/55">…</svg> Item
</a>

<!-- Group label -->
<button class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-white/65 hover:bg-white/[0.07]">…</button>

<!-- Divider --> <div class="my-2 h-px bg-white/[0.07]"></div>

<!-- Footer -->
<div class="border-t border-white/[0.08] p-3 sidebar-bottom"><!-- profile / sign out --></div>

<!-- Mobile drawer + backdrop -->
<aside class="fixed inset-y-0 left-0 z-30 w-[280px] -translate-x-full transition-transform lg:translate-x-0">…</aside>
<div class="fixed inset-0 z-[29] bg-black/50 backdrop-blur-sm lg:hidden"></div>
```

**Rules:** único elemento dark do sistema; ícone ativo `#9cc2ff`, inativo `text-white/55`; hover translada `2px`; collapsed = `w-[72px]` só ícones.

### 13.5 Form error UX

**Timing:**
- Validar required **on blur** — só mostra erro após sair do campo.
- Submit revalida tudo — força revelar.
- Errors precoces (on-change) só para format (email, CPF); mostra após primeiro blur.
- Server errors no topo do form em banner + replicados nos campos quando o backend mapear.
- **NUNCA esconder erro de submit no console.**

```html
<!-- Default + required asterisk -->
<label class="block space-y-1.5">
  <span class="text-sm font-semibold text-slate-700">Label <span class="text-rose-500" aria-hidden>*</span></span>
  <input aria-required="true" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base focus:border-[#002D72] focus:ring-2 focus:ring-[#002D72]/10" />
  <span class="text-xs text-slate-400">Optional helper</span>
</label>

<!-- Invalid -->
<input aria-invalid="true" aria-describedby="f-err" class="w-full rounded-2xl border border-rose-400 bg-white px-4 py-3.5 text-base focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10" />
<span id="f-err" class="flex items-center gap-1 text-xs font-medium text-rose-600">! Error message</span>

<!-- Form-level error banner -->
<div role="alert" class="flex items-start gap-3 rounded-xl border border-rose-200/60 bg-rose-50/70 px-4 py-3 ring-1 ring-rose-100">
  <svg class="mt-0.5 h-4 w-4 text-rose-600">!</svg>
  <div>
    <p class="text-sm font-semibold text-rose-700">Couldn't save</p>
    <ul class="mt-1 list-inside list-disc text-[12px] text-rose-700/80"><li>…</li></ul>
  </div>
</div>

<!-- Success confirmation -->
<div role="status" class="…border-emerald-200/60 bg-emerald-50/70 ring-emerald-100…">Saved</div>

<!-- Submit loading -->
<button disabled class="inline-flex items-center gap-2 rounded-[1.25rem] bg-[#002D72] px-5 py-2.5 text-sm font-semibold text-white opacity-80 cursor-wait">
  <svg class="h-3.5 w-3.5 animate-spin">…</svg> Saving…
</button>
```

### 13.6 Tooltip / popover system

**Tooltip:** texto curto, 1 linha, `max-w-[200px]`, delay 400ms hover (imediato em focus), placement auto-flip.

```html
<div role="tooltip" class="pointer-events-none absolute z-50 max-w-[200px] rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-white shadow-lg ring-1 ring-white/10">
  Short hint
</div>
```

A11y: `aria-describedby` no âncora; Esc fecha. Mobile: tap 1.5s ou label inline.

**Popover:** conteúdo rico, header+body+footer.

```html
<div role="dialog" aria-modal="false" class="absolute z-40 w-72 rounded-2xl bg-white p-4 shadow-lg ring-1 ring-black/5">
  <header class="mb-2 flex items-center justify-between">
    <p class="text-sm font-semibold text-slate-900">Title</p>
    <button aria-label="Close" class="rounded-md p-1 text-slate-400 hover:bg-slate-50">✕</button>
  </header>
  <div class="space-y-2 text-sm text-slate-600">…</div>
  <footer class="mt-3 flex justify-end gap-2">…</footer>
</div>

<!-- Mobile bottom sheet variant -->
<div role="dialog" aria-modal="true" class="fixed inset-x-0 bottom-0 z-40 rounded-t-[1.75rem] bg-white p-5 shadow-[0_-24px_60px_rgba(15,23,42,0.12)] ring-1 ring-black/5 sm:hidden">
  <div class="mx-auto mb-3 h-1 w-12 rounded-full bg-slate-200"></div>…
</div>
```

Click outside / Esc / X fecham. Z-index: popover 40, tooltip 50 (acima exceto modal).

### 13.7 Data visualization / charts

**Paleta token-aligned:**
```css
:root {
  --chart-1: #002D72;  /* brand navy — main metric */
  --chart-2: #4F5FB8;  /* secondary blue */
  --chart-3: #047857;  /* emerald — positive/income */
  --chart-4: #B45309;  /* amber — warning/late */
  --chart-5: #BE123C;  /* rose — negative/loss */
  --chart-6: #0F766E;  /* teal — recurring */
  --chart-7: #6D5FBF;  /* violet */
  --chart-8: #94A3B8;  /* slate — neutral fallback */
  --chart-grid: rgba(15,23,42,0.05);
  --chart-axis: #94A3B8;
  --chart-axis-label: #64748B;
  --chart-area-fill-opacity: 0.12;
}
```

**Style per chart type:**
| Chart | Cor | Stroke | Fill | Regras |
|-------|-----|--------|------|--------|
| Line | series tokens | 2px | none | smooth curve cardinal; sem dots em mobile |
| Bar | navy positive / rose negative | none | solid | `rounded-md` top; gap 30% |
| Area | navy | 1.5px | currentColor 12% | gridlines minimalistas |
| Donut | semantic series | 1px gap | solid | inner radius 60%; total ao centro `tabular-nums` |
| Sparkline | navy | 1.5px | none | sem axis, `h-8`/`h-10` |
| Progress | navy fill, slate-100 track | none | solid | h-2 rounded-full |

**Container + empty + loading:**
```html
<div class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
  <div class="mb-3 flex items-center justify-between">
    <div>
      <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Revenue</p>
      <p class="text-2xl font-bold tabular-nums text-[#002D72]">Value</p>
    </div>
    <ul class="flex gap-3 text-[11px] text-slate-500">
      <li class="flex items-center gap-1"><span class="h-2 w-2 rounded-full bg-[#002D72]"></span> This month</li>
    </ul>
  </div>
  <div class="h-64"><!-- chart svg --></div>
</div>

<!-- Empty -->
<div class="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl bg-white ring-1 ring-black/5">
  <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-black/5"><svg class="h-5 w-5 text-slate-400">…</svg></div>
  <p class="text-sm font-medium text-slate-500">No data yet</p>
</div>

<!-- Loading -->
<div class="h-64 animate-pulse rounded-2xl bg-slate-100 ring-1 ring-black/5"></div>
```

**Hard rules:**
- **Multi-currency:** **NUNCA SOMAR moedas diferentes em um total visual.** Agrupe por moeda (EUR/BRL/USD) com KPI separado. Disclaimer `text-[10px] text-slate-400`: "Values shown in EUR".
- Sem rainbow (>5 cores em série única).
- Sem 3D, sem efeitos de luz.
- Gradientes só em area fill subtle (12% opacity).
- Números sempre `tabular-nums`.
- Legendas compactas, abaixo de KPI principal.

### 13.8 Print / PDF styles

```css
@media print {
  :root { color-scheme: light !important; }

  @page { size: A4; margin: 20mm; }
  @page :first { margin-top: 25mm; }

  .sidebar-shell, .topbar, .toast-container, .no-print,
  nav[aria-label="Main navigation"] { display: none !important; }

  body { background: #fff !important; color: #0F172A !important; font-size: 10pt; line-height: 1.4; }

  *, *::before, *::after {
    box-shadow: none !important;
    text-shadow: none !important;
    background-image: none !important;
  }

  /* Status badges flatten */
  .print-badge-success { background: #ECFDF5 !important; color: #047857 !important; border: 1px solid #A7F3D0 !important; }
  .print-badge-warning { background: #FFFBEB !important; color: #B45309 !important; border: 1px solid #FDE68A !important; }
  .print-badge-danger  { background: #FFF1F2 !important; color: #BE123C !important; border: 1px solid #FECDD3 !important; }
  .print-badge-info    { background: #EFF6FF !important; color: #1D4ED8 !important; border: 1px solid #BFDBFE !important; }

  /* Tables */
  table { border-collapse: collapse; width: 100%; }
  thead { display: table-header-group; }
  tr    { page-break-inside: avoid; }
  th, td { padding: 6pt 8pt; border-bottom: 0.5pt solid #CBD5E1; text-align: left; }
  th { font-size: 9pt; text-transform: uppercase; letter-spacing: 0.05em; color: #64748B; font-weight: 600; }
  td.amount { text-align: right; font-variant-numeric: tabular-nums; font-weight: 700; color: #002D72; }

  /* Page break helpers */
  .page-break-before { page-break-before: always; }
  .page-break-after  { page-break-after: always; }
  .avoid-break       { page-break-inside: avoid; break-inside: avoid; }

  /* Show URL after links */
  a[href^="http"]::after { content: " (" attr(href) ")"; font-size: 8pt; color: #94A3B8; }

  /* Signature block */
  .print-signature { margin-top: 30pt; display: grid; grid-template-columns: 1fr 1fr; gap: 40pt; page-break-inside: avoid; }
  .print-signature .line { border-top: 0.5pt solid #0F172A; padding-top: 4pt; font-size: 9pt; color: #475569; text-align: center; }
}

/* Mobile warning (screen only) */
@media (max-width: 768px) {
  .print-mobile-warning {
    display: flex; align-items: center; gap: 8px;
    margin-bottom: 12px; padding: 8px 12px;
    border-radius: 8px; background: #FFFBEB; color: #B45309; font-size: 12px;
  }
}
```

**Document layout:**
```html
<header class="print-header" style="display:flex;align-items:center;justify-content:space-between;padding-bottom:8pt;border-bottom:0.5pt solid #CBD5E1">
  <img src="/logo-mono.svg" alt="Logo" style="height:24pt"/>
  <div style="text-align:right">
    <p style="font-size:14pt;font-weight:700;color:#002D72">Document Title</p>
    <p style="font-size:9pt;color:#64748B">Issued YYYY-MM-DD</p>
  </div>
</header>

<section class="avoid-break">…</section>

<div class="print-signature">
  <div class="line">Party A</div>
  <div class="line">Party B</div>
</div>
```

**Rules:** sombras OUT; gradientes OUT; sidebar/topbar OUT; navy `#002D72` títulos+currency; status flatten; page breaks controlados; logo mono `logo-mono.svg`; mobile mostra banner amber "For best results, print from desktop."

### 13.9 Keyboard shortcuts

**Shortcut map:**
| Tecla | Ação | Contexto |
|-------|------|----------|
| `⌘/Ctrl + K` | Command menu | Global |
| `/` | Focus search | Página com search |
| `⌘/Ctrl + S` | Save form | Form modificado |
| `Esc` | Close overlay | Overlay aberto |
| `Enter` | Confirm primary | Modal/form focado |
| `?` | Help overlay | Global |
| `↑ ↓` | Navigate list | Lista focada |
| `Tab / Shift+Tab` | Navigate focus | Sempre |
| `g` then `d` | Dashboard | Global |
| `g` then `p` | Pedidos / orders | Global |
| `g` then `f` | Finanças | Global |
| `g` then `c` | Clientes | Global |

**Visual recipe:**
```html
<!-- Key badge -->
<kbd class="inline-flex h-5 min-w-[20px] items-center justify-center rounded-md border border-slate-200 bg-white px-1.5 text-[10px] font-semibold text-slate-600 shadow-[0_1px_0_rgba(15,23,42,0.06)]">⌘</kbd>
<kbd class="…">K</kbd>

<!-- Inline hint -->
<div class="flex items-center justify-between">
  <span>Open command menu</span>
  <span class="flex items-center gap-1"><kbd>⌘</kbd><kbd>K</kbd></span>
</div>

<!-- Help overlay (? shortcut) -->
<div class="fixed inset-0 z-[70] grid place-items-center bg-slate-950/40 backdrop-blur-sm p-4">
  <div class="w-full max-w-2xl rounded-[1.75rem] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] ring-1 ring-black/5">
    <h2 class="mb-4 text-lg font-semibold text-[#002D72]">Keyboard shortcuts</h2>
    <div class="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
      <div class="flex items-center justify-between border-b border-slate-50 py-2">
        <span class="text-sm text-slate-600">Command menu</span>
        <span class="flex gap-1"><kbd>⌘</kbd><kbd>K</kbd></span>
      </div>
    </div>
  </div>
</div>
```

**Rules:**
- Documentar visualmente ANTES de implementar.
- Tooltip do botão mostra shortcut em `<kbd>`.
- Sequências (`g d`) delay máx 1.5s.
- **Focus safety:** shortcuts globais SKIP quando focus em `<input>`, `<textarea>`, `<select>`, `contenteditable`.
- **Esc fecha SEMPRE** — nunca capture sem deixar fechar.
- A11y: anunciar via toast quando shortcut executa ação.
- Mobile esconde shortcuts e help overlay.

---

## 14. Final copy block — "Apply ProFrance Visual Style"

```text
APPLY PROFRANCE VISUAL STYLE

ROLE
Senior Frontend Engineer + UI Architect + Premium SaaS Product Designer. Mobile-first.

MISSION
Apply the ProFrance premium operational SaaS visual style to this project. Visual-only. Preserve architecture. Minimal diff. Apply incrementally.

PRIVACY (HARD)
Do not copy ProFrance business data or business logic. Copy only the visual system, interaction style, layout philosophy, and premium SaaS UI patterns.

VISUAL SYSTEM
- White cards on near-flat page #F7F8FC. Dark navy sidebar is the only dark surface.
- Single brand action color: navy #002D72 (hover #003a94).
- Hero gradient: from-[#001F4D] via-[#002D72] to-[#2B1F5B] + translucent orbs.
- Semantic pills: emerald=ok, amber=warning, rose=danger, blue=info, teal=recurring.
- All numbers tabular-nums. Currency bold navy, right-aligned.
- Typography: text-3xl/600 navy page title; text-lg/700 slate-900 section; text-[11px] uppercase tracking-wide slate-400 muted label.

COMPONENT SYSTEM
- Page shell: min-h-screen bg-[#F7F8FC] p-4 sm:p-6 lg:p-8.
- Card default: rounded-2xl bg-white shadow-sm ring-1 ring-black/5; hover:shadow-md only if clickable.
- KPI: rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5; text-2xl font-bold tabular-nums text-[#002D72].
- Hero: rounded-2xl bg-gradient-to-br from-[#001F4D] via-[#002D72] to-[#2B1F5B] p-6 text-white shadow-lg ring-1 ring-white/10.
- Accent rail: top h-[2px] (category) or left border-l-[5px] (stage).
- Primary button: rounded-[1.25rem] bg-[#002D72] px-5 py-2.5 text-sm font-semibold text-white hover:-translate-y-0.5 hover:bg-[#003a94] active:scale-[0.98] focus-visible:ring-2 ring-[#002D72]/30. One per section.
- Secondary: border border-slate-200 bg-white text-slate-700 hover:bg-slate-50. Ghost: text-[#002D72] hover:bg-[#002D72]/10.
- Status badge: rounded-full bg-{tone}-50 px-2.5 py-0.5 text-[11px] font-semibold text-{tone}-700 ring-1 ring-{tone}-200.
- Form input: rounded-2xl border-slate-200 text-base focus:border-[#002D72] focus:ring-2 focus:ring-[#002D72]/10.
- Dialog: backdrop bg-slate-950/40 backdrop-blur-sm; card max-w-sm rounded-[1.75rem] shadow-[0_24px_80px_rgba(15,23,42,0.08)] ring-1 ring-black/5.
- Empty state: rounded-2xl bg-white py-14 text-center; icon bubble bg-slate-50 ring-1 ring-black/5.
- Progress: track h-2 bg-slate-100 rounded-full; fill bg-[#002D72] rounded-full.

DASHBOARD HIERARCHY
1. Hero / command summary (≤4 KPIs, navy gradient).
2. Action required (rose rail + count badge; hide if 0).
3. Today (blue rail).
4. Next 24h (amber rail; date chips amber if ≤2 days).
5. Secondary insights (slate rail).

MOBILE RULES
- Safe at 375/390px. Zero horizontal overflow.
- grid-cols-1 default → sm:/md:/xl: breakpoints.
- Tables convert to stacked cards (hidden md:table + block md:hidden).
- Touch ≥44px. Primary buttons full-width on mobile.
- Dialog max-h-[60vh] + overflow-y-auto + safe-area bottom.
- Inputs text-base (anti iOS zoom).
- Section headers flex-wrap gap-3.

SAFETY (FORBIDDEN)
- No business logic, data fetching, schema, auth, or route changes.
- No new dependencies without explicit approval.
- No dark mode unless requested.
- No unrelated refactor.
- No build/lint/test config changes.
- No copying ProFrance private data, business logic, Supabase implementation, or operational workflows.
- No neon, bounce, candy shadow, solid pastel cards, full-red destructive backgrounds.

OUTPUT FORMAT
1. Visual audit (bullets) of current target pain points.
2. Files to modify (grouped by concern).
3. Per-file visual changes proposed (concise).
4. Phased implementation plan (tokens → shell → cards → dashboard → forms → mobile QA).
5. Confirmation: "No business logic, data fetching, schema, auth, or routes were changed."
6. QA checklist: desktop + tablet + mobile 375/390 + a11y + integrity (tsc, build, lint).

Start with step 1 (audit) and wait for approval before editing any file.
```

---

---

## 15. Final Visual Transfer Readiness

### Readiness score: **97 / 100**

Após merge do adendo, o kit cobre todos os 9 sistemas avançados com recipes Tailwind/CSS prontos. Outro time/agente pode reproduzir o visual ProFrance a nível production-grade sem ver o app original.

### O que está completo ✅
- Tokens de cor (brand + surface + border + text + semantic) — copy-ready.
- Tipografia (10 papéis mapeados Geist).
- Cards (default, KPI, hero, alert, list, section, dialog, empty).
- Buttons (primary, secondary, ghost, soft CTA, destructive, mobile-full, loading).
- Badges semânticos (success/warning/danger/info/neutral/recurring + variants).
- Forms (inputs + selects + textarea + invalid + helper + banner + submit-loading).
- Dialogs / drawers (small confirm + side drawer with sticky footer).
- Tables / lists (desktop + mobile card transform).
- Empty states e progress bars.
- Dashboard blueprint (5-section hierarchy + accent rails + count badges).
- Mobile-first (375/390 safe; tabela → card; touch ≥44px; iOS anti-zoom).
- Motion (200ms ease-out; hover lift só clicáveis; skeleton; no bounce/neon).
- **Toast system** com 6 variants (success/error/warning/info/loading/persistent).
- **Z-index scale** completa 0→100 com regras de colisão.
- **Sidebar gradient stack** real (5 radial + 1 linear navy) reusável.
- **Form error UX** (on-blur, server banner, ARIA).
- **Tooltip / popover** patterns (dark/light variants; mobile bottom sheet).
- **Chart palette** token-aligned + regra hard multi-currency.
- **Print/PDF** CSS completo (A4, page breaks, flatten badges).
- **Keyboard shortcuts** mapa + `<kbd>` style + help overlay + focus safety.
- Universal AI prompt em 3 tamanhos (full / short / micro).
- QA checklist desktop + tablet + mobile 375/390 + a11y + integridade + 8 grupos avançados.

### Opcionais remanescentes (não bloqueantes)
1. **Color picker UX** — se futuro tema custom por usuário.
2. **Skeleton variants** — text-line / avatar / complex card.
3. **Animation choreography** — stagger de entrada de listas.
4. **Email templates** — se app envia transacionais.
5. **Marketing/auth pages** — login/signup têm padrão próprio simpler.
6. **i18n typography** — RTL/CJK não cobertos.
7. **Error boundaries** — fallback UI de crash sem padrão visual.
8. **Onboarding tour / coach marks** — se app tiver guided tour.

Esses 8 podem virar prompt dedicado quando demanda surgir.

### Ready to teach another system?
**SIM.** Este kit é o single best source para colar em outro projeto SaaS premium. Cobre dos tokens até as quirks (warm beige só em finance, sidebar único dark surface, 9cc2ff em ícone nav ativo, etc.).

### Final warning ⚠️

> **Do not copy ProFrance business data or business logic.**
> **Copy only the visual system, interaction style, layout philosophy, and premium SaaS UI patterns.**
> Dados de cliente, regras financeiras, schemas Supabase, workflows operacionais, autenticação e rotas do app alvo permanecem intactos. O kit transfere look & feel — não domínio.

---

*Kit derivado de [audit](./profrance-visual-system-audit.md) + [bible](./profrance-ui-style-bible.md) + [universal prompt](./profrance-universal-visual-prompt.md) + [gaps addendum](./profrance-visual-system-gaps-addendum.md). Sem alteração de código de aplicação. Sem dados privados. Sem lógica de negócio.*
