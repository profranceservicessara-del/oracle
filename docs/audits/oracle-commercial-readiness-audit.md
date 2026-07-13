# Oracle Commercial Readiness Audit

> Data: 2026-07-13 · Modo: auditoria (nenhuma lógica de produção alterada) · Branch: main

## Executive summary

- **Overall readiness score: 72/100**
- **Recomendação: Pronto para BETA controlado** (não venda pública aberta ainda).
- Conclusão (5 linhas):
  1. O núcleo do produto é real e completo: emissão de faturas/devis, clientes, CRM/pipeline, fluxo de caixa, faturas recebidas com vínculo a despesas, comprovantes, preparação fiscal e suporte 48h.
  2. Billing está de fato integrado ao Stripe (checkout, portal, webhook, faturas) com gating "grandfather" — tecnicamente vendável.
  3. Segurança sólida: RLS por dono em todas as tabelas do core, storage por URL assinada, service-role só no servidor.
  4. Bloqueios reais são de **funil de venda**, não de funcionalidade: CTAs de plano na página `/offres` são botões mortos (TODO), variáveis Stripe de produção precisam ser confirmadas, e falta onboarding/checklist + caixa de entrada admin para responder o suporte.
  5. Caminho rápido p/ V1 vendável: ligar `/offres` ao checkout, confirmar env do Stripe em produção, adicionar wizard de setup inicial e um inbox admin para o Conselheiro.

## What is already ready

- **Navegação completa:** 0 itens "Em breve", 0 `href="#"`, todas as rotas da sidebar reais e ativas; active-state funcionando.
- **Build:** `npm run build` verde, sem erros TypeScript, sem warnings.
- **Billing Stripe wired:** rotas `/api/stripe/{checkout,portal,webhook,invoices}`; página `/configuracoes/pagamentos` trata retorno de checkout, lista faturas, abre portal. Nenhum dado de cartão coletado no app.
- **Gating grandfather** (`src/lib/plan-matrix.ts`): só bloqueia quem tem assinatura paga ativa num tier abaixo do requerido; free/inactive não bloqueiam. Deliberado e claro.
- **Legais presentes:** `/cgu-cgv`, `/mentions-legales`, `/politique-de-confidentialite` (páginas reais).
- **Landing pública** (`src/app/page.tsx`): features + planos; redireciona logados p/ o app.
- **Health endpoint:** `/api/health`.
- **Segurança de dados:** RLS por dono em `payments`, `documents`, `purchases`, `supplier_invoices`, `advisor_requests`, `crm_*`; storage privado com URL assinada (`documents`, `supplier-invoices`, `logos`); nenhum path de storage exposto (só flags/contagens).
- **Responsivo:** 375px sem overflow horizontal nas páginas auditadas; tabelas em containers `overflow-x-auto`.
- **Workflows reais:** clientes CRUD, factures/devis, faturas recebidas + vínculo/criação de despesa (sem double-count no /financeiro), fluxo de caixa, comprovantes (signed URL), CRM/pipeline, preparação fiscal (URSSAF/fiscais/auxiliares), Conselheiro 48h persistido.

## P0 blockers before selling

1. **CTAs de plano em `/offres` são botões mortos.** `type="button"` sem `onClick`; comentário `TODO: Connect plan selection to subscription/payment flow`. Se o funil manda o comprador p/ `/offres`, ele não consegue comprar ali (checkout real só existe em `/configuracoes/pagamentos`). **Bloqueia venda SE `/offres` for a página de compra.**
2. **Confirmar variáveis Stripe de produção** (price IDs, `STRIPE_WEBHOOK_SECRET`, chaves live). Não verificável pelo código — precisa checar no Vercel/Stripe. Sem isso, checkout/webhook falham em produção.
3. **Confirmar dois projetos Vercel** (oracle vs profrance) não estão publicando o mesmo repo de forma conflitante (histórico da sessão). Verificar antes de anunciar URL de venda.

## P1 improvements before public launch

- **Toggle Mensal/Anual em `/offres`** não conectado (`TODO`).
- **Facturation superficial:** seletor "Todos os exercícios" e busca/filtro não wired (`TODO: Connect exercise selector / search`) em `/facturation` e `/facturation/devis`.
- **`/facturation/recurrentes`** parece placeholder (`TODO: Connect recurring invoices to subscription permissions`).
- **Onboarding fraco:** sem wizard/checklist de primeiro uso. `isProfileIncomplete` existe (`src/lib/profile-completeness.ts`) mas o nudge "Complete os dados da empresa" saiu do Conselheiro no rework. Novo usuário pode não saber por onde começar.
- **Admin inbox do Conselheiro ausente:** respostas a `advisor_requests` só via service-role/script — o lado do vendedor não tem tela para responder. Loop de suporte incompleto.
- **Email transacional gated:** fallback "Envio de e-mail indisponível" quando `RESEND_API_KEY` ausente. Confirmar se e-mails (confirmação, lembretes) estão ativos em produção.
- **Duplicação `documentos` (pt, módulo completo) vs `documents` (en, hub contábil):** nomes confusos, dois lugares. Consolidar ou renomear.

## P2 later improvements

- URSSAF config: sem data de nascimento e sem múltiplas categorias/CIPAV (ausentes no schema; exigiria migration aditiva).
- Experiência de trial/demo dedicada.
- Trust indicators na landing (depoimentos, logos, segurança).
- Estados de loading/skeleton mais ricos (há `loading.tsx` global).
- Revisão de idioma: mistura pt-BR + termos FR (devis, encaissement, seuils) — intencional p/ o público, mas padronizar glossário.

## Module-by-module audit

| Módulo | Status | Prod-ready | Faltando | Risco | Recomendação |
|---|---|---|---|---|---|
| Landing (`/`) | Ativo | Sim | trust indicators, CTA→signup claro | Baixo | Reforçar prova social + CTA |
| Dashboard | Ativo | Sim | nudge de onboarding | Baixo | Adicionar checklist 1º uso |
| Financeiro | Ativo | Sim | — | Baixo | OK |
| Meu Conselheiro | Ativo | Sim (user) | inbox admin p/ responder | Médio | Construir tela admin protegida |
| Declarações fiscais | Ativo | Sim | — (prep-only) | Baixo | OK |
| Declarações auxiliares | Ativo | Sim | — | Baixo | OK |
| Comprovantes | Ativo | Sim | — | Baixo | OK |
| Facturation | Ativo | Parcial | seletor exercício + busca wired | Médio | Ligar filtros reais |
| Devis / Orçamentos | Ativo | Parcial | mesmos TODOs de filtro | Médio | Ligar filtros |
| Faturas recebidas | Ativo | Sim | — (CRUD+vínculo+anexo) | Baixo | OK |
| Clientes | Ativo | Sim | — | Baixo | OK |
| Catálogo | Ativo | Sim | — | Baixo | OK |
| Documents (`/documents`) | Ativo | Parcial | duplicação c/ `/documentos` | Médio | Consolidar naming |
| CRM | Ativo | Sim | — | Baixo | OK |
| Pipeline | Ativo | Sim | undo já existe | Baixo | OK |
| Configurações | Ativo | Sim | — | Baixo | OK |
| Pagamentos / Billing | Ativo | Sim | env prod a confirmar | Médio | Verificar Stripe live |

## User journey audit

1. **Visitante na landing** — ✅ landing real com features/planos. ⚠️ CTA de signup pode ser mais forte.
2. **Cria conta / login** — ✅ `/cadastro` + `/login` (force-dynamic, middleware guard).
3. **Configura empresa** — ✅ `/configuracoes/empresa` (SIRET, endereço, categoria) + `/urssaf/configuracao`. ⚠️ sem passo guiado.
4. **1º cliente** — ✅ Clientes CRUD.
5. **Cria fatura/devis** — ✅ emissão real, numeração sequencial. ⚠️ filtros superficiais.
6. **Registra pagamento/despesa** — ✅ payments + purchases (registre-des-achats / faturas recebidas).
7. **Confere fluxo de caixa** — ✅ /financeiro (entradas/saídas/saldo/a receber).
8. **Prepara declarações** — ✅ URSSAF + fiscais + auxiliares (prep-only, disclaimers).
9. **Pede ajuda no Conselheiro** — ✅ envia; ⚠️ resposta depende de processo manual (sem inbox admin).
10. **Faz upgrade/paga** — ✅ via `/configuracoes/pagamentos` (checkout Stripe). ❌ via `/offres` (botão morto).

**Gap crítico do funil:** passos 1→10 funcionam, EXCETO a compra a partir da vitrine de planos (`/offres`).

## Security and data safety notes

- RLS por dono confirmada nas tabelas do core; políticas separadas select/insert/update/delete no padrão `auth.uid() = user_id` (e `crm_is_company_member` no CRM).
- `advisor_requests`: usuário só lê/cria os próprios; sem update/delete → status e `admin_response` protegidos (só service-role).
- `admin-supabase.ts` (service-role) é server-only; não há role de admin exposta ao cliente.
- Storage privado + URLs assinadas (120s–900s); nenhum path bruto renderizado.
- Sem segredos no client; middleware guardado contra env ausente.
- **A confirmar (fora do código):** rotação/escopo das chaves service-role; que `.env.local` não vaza em logs.

## Billing readiness

- **Tecnicamente pronto:** Stripe checkout + portal + webhook + listagem de faturas implementados; estados de assinatura (`plan`, `subscription_status`, `current_period_end`) lidos do profile; retorno de checkout tratado com recarga; gating grandfather claro.
- **Falta p/ vender:** (a) ligar CTAs de `/offres` ao checkout (hoje só `/configuracoes/pagamentos` compra); (b) confirmar price IDs + webhook secret + chaves LIVE no ambiente de produção; (c) testar 1 ciclo real de compra/cancelamento/reembolso em modo live.

## Legal/compliance readiness

- Presentes: `/cgu-cgv` (CGU/CGV), `/mentions-legales`, `/politique-de-confidentialite`. Disclaimers fiscais nos módulos URSSAF/declarações ("não substitui orientação oficial").
- A revisar (produto, não conselho jurídico): links de legal visíveis no rodapé da landing e no fluxo de signup; consentimento RGPD no cadastro; página de exclusão/exportação de dados (há rota `/api/rgpd/export`) exposta ao usuário.

## Recommended next 10 tasks

1. **Ligar CTAs de `/offres` ao checkout Stripe** — P0 — sem isso a vitrine de planos não vende — Risco: baixo — reusar a chamada de checkout já existente em `/configuracoes/pagamentos`.
2. **Verificar env Stripe LIVE em produção** (price IDs, webhook secret, chaves) — P0 — checkout/webhook quebram sem isso — Risco: baixo — checklist no Vercel + teste live.
3. **Resolver duplicidade de projetos Vercel (oracle vs profrance)** — P0 — evita deploy/URL errada na venda — Risco: médio — desconectar repo do projeto errado.
4. **Inbox admin do Conselheiro** — P1 — fechar o loop de suporte 48h — Risco: médio — rota protegida por allowlist de e-mail lendo/atualizando `advisor_requests` via service-role.
5. **Wizard/checklist de onboarding no dashboard** — P1 — ativação do novo usuário — Risco: baixo — reusar `isProfileIncomplete` + próximos passos.
6. **Wire toggle Mensal/Anual em `/offres`** — P1 — pricing correto — Risco: baixo.
7. **Ligar seletor de exercício + busca em Facturation/Devis** — P1 — remover botões superficiais — Risco: baixo — filtrar dados já carregados.
8. **Consolidar `/documents` vs `/documentos`** — P1 — clareza de navegação — Risco: médio — escolher canônico, redirecionar o outro.
9. **Confirmar e-mail transacional (RESEND) em produção** — P1 — confirmações/lembretes — Risco: baixo — setar env + testar.
10. **Trust indicators + CGV no rodapé da landing** — P2 — conversão/legal visível — Risco: baixo.

## Final verdict

**Ready for controlled beta only.**

O produto e o billing são reais e seguros o suficiente para cobrar de clientes iniciais **por um canal controlado** (onboarding manual + compra via `/configuracoes/pagamentos`). Para **venda pública/self-serve**, resolver os P0 (CTA de `/offres`, env Stripe live, projeto Vercel) e os P1 de funil (onboarding, inbox admin, filtros superficiais).
