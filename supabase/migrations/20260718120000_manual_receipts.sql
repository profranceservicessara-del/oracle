-- Livro de receitas: entradas MANUAIS (recibos sem fatura — registro contábil
-- obrigatório do micro-entrepreneur). Aditiva + idempotente. Aparecem no livro
-- e nos exports; NÃO entram no /financeiro nem na base URSSAF automaticamente
-- (a base do motor continua payments.date_encaissement — anti double-count).

create table if not exists public.manual_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_name text,
  reference text,
  date_encaissement date not null,
  categorie text not null check (categorie in ('vente', 'service_bic', 'service_bnc')),
  moyen text not null check (moyen in ('virement', 'cheque', 'especes', 'cb', 'stripe', 'autre')),
  montant numeric(12,2) not null check (montant > 0),
  fichier_path text,
  created_at timestamptz not null default now()
);

alter table public.manual_receipts enable row level security;

drop policy if exists "manual_receipts_select_own" on public.manual_receipts;
create policy "manual_receipts_select_own" on public.manual_receipts for select using (auth.uid() = user_id);
drop policy if exists "manual_receipts_insert_own" on public.manual_receipts;
create policy "manual_receipts_insert_own" on public.manual_receipts for insert with check (auth.uid() = user_id);
drop policy if exists "manual_receipts_update_own" on public.manual_receipts;
create policy "manual_receipts_update_own" on public.manual_receipts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "manual_receipts_delete_own" on public.manual_receipts;
create policy "manual_receipts_delete_own" on public.manual_receipts for delete using (auth.uid() = user_id);

create index if not exists manual_receipts_user_date_idx on public.manual_receipts(user_id, date_encaissement desc);
