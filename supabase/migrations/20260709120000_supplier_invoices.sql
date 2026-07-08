-- Factures reçues / faturas de fornecedores.
-- Aditiva e idempotente. Deriva convenções das tabelas existentes
-- (purchases, crm_*): gen_random_uuid, user_id -> auth.users on delete
-- cascade, RLS por dono, trigger public.set_updated_at().
-- fichier_path fica nullable para anexo futuro (sem bucket/upload nesta V1).

create table if not exists public.supplier_invoices (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,

  fournisseur text not null,
  reference text,
  designation text,

  date_reception date not null,
  date_echeance date,

  montant_ttc numeric(12,2) not null check (montant_ttc >= 0),
  montant_tva numeric(12,2) check (montant_tva is null or montant_tva >= 0),

  status text not null default 'a_payer'
    check (status in ('a_payer', 'payee', 'a_verifier')),

  purchase_id uuid references public.purchases(id) on delete set null,

  fichier_path text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.supplier_invoices enable row level security;

-- Policies idempotentes (create policy nao tem IF NOT EXISTS).
drop policy if exists "supplier_invoices_select_own" on public.supplier_invoices;
create policy "supplier_invoices_select_own"
on public.supplier_invoices
for select
using (auth.uid() = user_id);

drop policy if exists "supplier_invoices_insert_own" on public.supplier_invoices;
create policy "supplier_invoices_insert_own"
on public.supplier_invoices
for insert
with check (auth.uid() = user_id);

drop policy if exists "supplier_invoices_update_own" on public.supplier_invoices;
create policy "supplier_invoices_update_own"
on public.supplier_invoices
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "supplier_invoices_delete_own" on public.supplier_invoices;
create policy "supplier_invoices_delete_own"
on public.supplier_invoices
for delete
using (auth.uid() = user_id);

-- updated_at automatico (reusa a funcao compartilhada existente).
create or replace trigger supplier_invoices_set_updated_at
before update on public.supplier_invoices
for each row execute function public.set_updated_at();

create index if not exists supplier_invoices_user_id_idx
on public.supplier_invoices(user_id);

create index if not exists supplier_invoices_user_status_idx
on public.supplier_invoices(user_id, status);

create index if not exists supplier_invoices_user_due_date_idx
on public.supplier_invoices(user_id, date_echeance);

create index if not exists supplier_invoices_purchase_id_idx
on public.supplier_invoices(purchase_id);
