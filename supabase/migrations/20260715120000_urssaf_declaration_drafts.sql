-- URSSAF: rascunhos de base de declaração (preparação, NÃO envio oficial).
-- Aditiva + idempotente. Snapshot auditável: as linhas copiam os valores no
-- momento da preparação (payment_id/document_id só informativos, sem FK às
-- tabelas financeiras — não trava nem altera payments/documents).
-- Sem alíquotas, sem cálculo de contribuição, sem credenciais URSSAF.

create table if not exists public.urssaf_declaration_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  periodicite text not null check (periodicite in ('mensal', 'trimestral')),
  -- ready = pronta para revisar; confirmed = base revisada/travada.
  status text not null default 'ready' check (status in ('ready', 'confirmed')),
  total_confirmed numeric(12,2) not null default 0,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period_start, period_end)
);

create table if not exists public.urssaf_declaration_lines (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.urssaf_declaration_drafts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_id uuid,
  document_id uuid,
  date_encaissement date not null,
  montant numeric(12,2) not null,
  client_name text,
  numero text,
  categorie text check (categorie is null or categorie in ('vente', 'service_bic', 'service_bnc')),
  moyen text,
  -- confirmed entra na base; needs_review NUNCA entra automaticamente; excluded fora.
  status text not null default 'confirmed' check (status in ('confirmed', 'needs_review', 'excluded')),
  reason text,
  created_at timestamptz not null default now()
);

alter table public.urssaf_declaration_drafts enable row level security;
alter table public.urssaf_declaration_lines enable row level security;

drop policy if exists "urssaf_drafts_select_own" on public.urssaf_declaration_drafts;
create policy "urssaf_drafts_select_own" on public.urssaf_declaration_drafts for select using (auth.uid() = user_id);
drop policy if exists "urssaf_drafts_insert_own" on public.urssaf_declaration_drafts;
create policy "urssaf_drafts_insert_own" on public.urssaf_declaration_drafts for insert with check (auth.uid() = user_id);
drop policy if exists "urssaf_drafts_update_own" on public.urssaf_declaration_drafts;
create policy "urssaf_drafts_update_own" on public.urssaf_declaration_drafts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "urssaf_drafts_delete_own" on public.urssaf_declaration_drafts;
create policy "urssaf_drafts_delete_own" on public.urssaf_declaration_drafts for delete using (auth.uid() = user_id);

drop policy if exists "urssaf_lines_select_own" on public.urssaf_declaration_lines;
create policy "urssaf_lines_select_own" on public.urssaf_declaration_lines for select using (auth.uid() = user_id);
drop policy if exists "urssaf_lines_insert_own" on public.urssaf_declaration_lines;
create policy "urssaf_lines_insert_own" on public.urssaf_declaration_lines for insert with check (auth.uid() = user_id);
drop policy if exists "urssaf_lines_update_own" on public.urssaf_declaration_lines;
create policy "urssaf_lines_update_own" on public.urssaf_declaration_lines for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "urssaf_lines_delete_own" on public.urssaf_declaration_lines;
create policy "urssaf_lines_delete_own" on public.urssaf_declaration_lines for delete using (auth.uid() = user_id);

create or replace trigger urssaf_declaration_drafts_set_updated_at
before update on public.urssaf_declaration_drafts
for each row execute function public.set_updated_at();

create index if not exists urssaf_drafts_user_period_idx on public.urssaf_declaration_drafts(user_id, period_start);
create index if not exists urssaf_lines_draft_idx on public.urssaf_declaration_lines(draft_id);
create index if not exists urssaf_lines_user_idx on public.urssaf_declaration_lines(user_id);
