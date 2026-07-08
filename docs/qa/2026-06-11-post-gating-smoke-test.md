Todos os checks passam. Compilo.

# Post-gating smoke test — Oracle

*(Rodado no preview local contra o **banco de produção** — domínio live é bloqueado pra automação. Mesmo código/dados/estado degradado da prod. gestion = free/inativo.)*

## 1. Free / grandfather
✅ **Sem muro de upgrade.** Dashboard, `/crm`, `/crm/pipeline`, `/crm/agenda` carregam **conteúdo real** (board/lista, não UpgradeState). Deal: **criar + mover + excluir** funciona pela UI (grandfather). Nenhum wall inesperado nos fluxos validados.

## 2. Core MVP (todas 200, sem 500/wall)
✅ `/clientes` `/facturation` `/facturation/devis` `/catalogo` `/documents` (contabilidade) `/configuracoes/perfil` `/configuracoes/empresa` `/configuracoes/pagamentos`. PDF = `%PDF-` (verificado nesta sessão). CRM detail + Pipeline abertos.

## 3. Gated / soon
✅ **9 badges "Em breve"** desabilitados; **nenhum** vira link quebrado (`href="#"` não navega). CTA de upgrade → **`/configuracoes/pagamentos`** (verificado no teste de gate). Billing sem Stripe = empty state, **sem crash**, **sem env/segredo/stack**.

## 4. Billing Stripe-off
✅ `/configuracoes/pagamentos` = 200, "Nenhuma fatura de assinatura disponível", `/api/stripe/invoices` = 200 (`hasCustomer:false`). Nenhum detalhe interno exposto.

## 5. Navegação
✅ Sidebar presente. **Pipeline** aparece no menu CRM (link `/crm/pipeline`) e abre pra free. "Em breve" polidos/desabilitados. Active-route funciona.

## 6. Limpeza
✅ Deal QA "POSTGATE QA Deal" **deletado** (DB 0). gestion **restaurado** free/inactive (não deixei plano de teste ativo). Nenhum dado de teste na produção.

## 7. Regressões
**Nenhuma.** Nota (não-regressão): `/rgpd` = 404 — não é rota de página; RGPD é via `/api/rgpd/export|delete` + settings. Sempre foi assim.

## 8. Go / No-Go
**✅ GO.** Gating grandfather não quebrou nada: free/test account mantém acesso total ao MVP validado (CRM/Pipeline inclusos), gated só ativa com assinatura paga de tier abaixo (provado: essentiel-ativo → upgrade; free → board), gated/soon seguros, billing degrada sem crash/segredo. **Nenhuma mudança de código necessária.**
