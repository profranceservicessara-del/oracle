-- Fecha buraco de segurança nas tabelas crm_deadlines e crm_portal_accesses.
--
-- O linter de segurança apontou policies permissivas (`USING (true)` para ALL)
-- que davam acesso irrestrito de leitura/escrita a anon e authenticated —
-- vazamento de dados via API pública.
--
-- Ambas as tabelas estão vazias (0 linhas), não são referenciadas em nenhum
-- lugar do código do app e não têm coluna company_id que permita aplicar o
-- padrão de tenancy crm_is_company_member(). São tabelas órfãs/legadas.
--
-- Correção: remover as policies permissivas. RLS permanece habilitado; sem
-- policy, anon e authenticated ficam sem acesso — apenas o service_role
-- (backend) contorna a RLS. Mesmo estado seguro das demais tabelas internas
-- (bank_webhook_events, rgpd_*). Idempotente.

drop policy if exists "cdl_all" on public.crm_deadlines;
drop policy if exists "cpa_all" on public.crm_portal_accesses;

-- Garante RLS ligado (no-op se já estiver).
alter table public.crm_deadlines enable row level security;
alter table public.crm_portal_accesses enable row level security;
