-- CRM bugfix: a company owner must be able to SELECT (and RETURNING-after-INSERT)
-- their own company even before the owner membership row exists.
--
-- The previous SELECT policy was member-only (crm_is_company_member(id)). During
-- bootstrap the flow is: insert company -> insert membership. The insert used
-- `.select()` (RETURNING), which is filtered by the SELECT policy; with no
-- membership yet the row was hidden, supabase-js returned null, and CRM bootstrap
-- failed with "Impossible d'initialiser votre espace CRM". Same for the initial
-- "select by owner_id" lookup. Allowing the owner to see their own row fixes both.
-- Idempotent.

drop policy if exists "crm_companies_select" on public.crm_companies;
create policy "crm_companies_select" on public.crm_companies for select to authenticated
using (owner_id = auth.uid() or public.crm_is_company_member(id));
