# ProFrance Visual Style — Target Project Profile (Oracle / ProFacture)

> Perfil reutilizável para a skill `profrance-visual-style`. Cole o bloco "TARGET PROJECT INFO"
> nos prompts da skill. Regras de negócio detalhadas ficam em [`CONTEXT.md`](../CONTEXT.md).
> Última atualização: 2026-06-17.

```text
TARGET_REPO:
  Local:  /Users/brunasilva/Projects/Sistemas/oracle
  Git:    https://github.com/profranceservicessara-del/oracle  (branch: main)

TARGET_STACK:
  Next.js 14 (App Router, ^14.2.35) + React 18 + Tailwind CSS v3 (^3.4.17)
  + TypeScript (^5.9.3, strict) + Supabase (@supabase/ssr) + zod.
  PDF/export via playwright-core + @sparticuz/chromium. Package manager: npm.

TARGET_LOCALHOST:
  http://localhost:3000  (CONFIRMADO com a owner; dev server em uso)
  Porta 3000 obrigatória — callback de auth do Supabase espera localhost:3000.

TARGET_ARCHITECTURE:
  Next.js App Router com route groups:
   - (app)  -> area autenticada
   - (auth) -> login/cadastro
   - rotas publicas soltas (landing + legais) + /api (route handlers) + middleware.ts

TARGET_MODULES:
  dashboard | documentos (+[id], /novo, /[id]/editar, actions.ts) | clientes |
  catalogo | livre-de-recettes | registre-des-achats | configuracoes/{perfil,dados} |
  (auth) login/cadastro | legais (cgu-cgv, mentions-legales, politique-de-confidentialite)

TARGET_DATABASE:
  Supabase (Postgres + Auth + Storage). Migrations em supabase/migrations/. NAO TOCAR.

TARGET_DEPLOYMENT:
  Vercel (.vercel presente; deploy via push na main). Confirmar conexao repo<->Vercel
  e env vars na Vercel (Supabase + RESEND) — o .env.local NAO vai pro Git.

TARGET_VISUAL_DIRECTION:
  Partial / incremental. FEITO: dashboard (hero navy -> action rose -> operacional ->
  zona fiscal), token brand navy global, Button compartilhado, limpeza de teal em
  inputs/botoes. PROXIMO: paginas operacionais (listas/forms) e auth.

TARGET_AUTH_BOUNDARIES:
  Publico:  / | (auth)/login | (auth)/cadastro | /cgu-cgv | /mentions-legales |
            /politique-de-confidentialite | /auth/callback
  Atras de auth (middleware.ts): tudo em (app)/** e rotas /api relevantes.
  Logado, /login e /cadastro redirecionam para /dashboard.

TARGET_ALLOWED_FILES (visual-only):
  src/components/ui/**          (button, input, select, textarea, badge, toast, data-table, ...)
  src/app/(app)/**/*.tsx        (paginas e *-client.tsx — apenas JSX/classes visuais)
  src/app/(auth)/**/*.tsx
  src/components/{app,documents,legal}/**/*.tsx
  src/app/globals.css           (somente se aprovado; CSS global e sensivel)
  tailwind.config.ts            (somente tokens visuais; ciente do efeito GLOBAL)

TARGET_FORBIDDEN_FILES:
  supabase/**                           (schema, migrations, RLS)
  src/app/api/**                        (route handlers / payloads)
  src/lib/supabase/** | src/middleware.ts | src/app/auth/callback/**   (auth)
  src/lib/accounting.ts | src/lib/accounting-data.ts |
  src/lib/document-calculations.ts | src/config/fiscal.ts             (calculos fiscais)
  src/lib/pdf.ts | src/lib/server/** | src/lib/validation.ts | src/lib/types.ts
  .env* | scripts/**

TARGET_FIRST_PAGE_TO_POLISH:
  (dashboard concluido.) Proxima recomendada:
  src/app/(auth)/login/page.tsx + login-form.tsx — baixa dependencia de dados,
  publica, alto impacto (1a tela). Alternativa: configuracoes/perfil (form isolado).

TARGET_DESIGN_RISKS:
  - Token `brand` e GLOBAL -> trocar cor afeta o app inteiro.
  - DataTable (src/components/ui/data-table.tsx) NAO tem cards mobile — usa tabela
    min-w-[720px] + overflow-x-auto (scroll horizontal dentro da caixa).
  - Conflito build/dev: NAO rodar `npm run build` com `next dev` ativo (corrompe .next
    e remove o CSS). Validar com `tsc --noEmit`; p/ build, parar o dev antes.
  - #0f766e (teal) em pdf.ts / exports / placeholder de perfil = COR DE DOCUMENTO do
    usuario (saida de negocio) — nao confundir com brand, nao trocar.
  - Sem dark mode (light-only) — nao introduzir.
  - Geracao de PDF usa chromium serverless (vendor) — fragil, fora do escopo visual.
  - teal semantico em badge.tsx/toast.tsx (success) — decisao pendente da owner.

TARGET_BUSINESS_LOGIC_THAT_MUST_NOT_CHANGE:
  - Queries/fetching Supabase em todas as paginas.
  - Calculos fiscais: lib/accounting*.ts, document-calculations.ts, config/fiscal.ts
  - Auth: lib/supabase/{client,server,middleware}.ts, middleware.ts, auth/callback
  - API/route handlers: src/app/api/** (cron/reminders, rgpd, pdf/email, exports)
  - Geracao de documentos: lib/pdf.ts, lib/server/zip.ts
  - Validacao/tipos: lib/validation.ts, lib/types.ts
  - documentos/actions.ts (server actions)
```

## Paleta ProFrance (referência rápida)

- Brand navy: `#002D72` (hover `#003a94`, active `#001F4D`)
- Hero gradiente: `from-[#001F4D] via-[#002D72] to-[#2B1F5B]`
- Página: `#F7F8FC` · Cards: `bg-white rounded-2xl ring-1 ring-black/5 shadow-sm`
- Labels: `uppercase text-[11px] tracking-wide text-slate-400`
- Números: `tabular-nums`; moeda em navy bold
- Status semânticos: emerald=ok, amber=warning, rose=danger, blue=info, teal=recurring
- Focus ring de inputs: `focus:ring-[#bcd0ee]`
