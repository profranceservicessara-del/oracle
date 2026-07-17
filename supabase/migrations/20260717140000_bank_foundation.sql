-- Fase 5: fundação bancária (Open Banking + import manual). Aditiva +
-- idempotente. REGRA CRÍTICA: transações bancárias cruas NUNCA entram no
-- /financeiro nem na declaração URSSAF — só conciliação confirmada (Fase 6)
-- poderá ligar/criar um payment. Nenhuma tabela financeira existente é tocada.
-- Tokens de provedor NÃO são armazenados aqui (server-side/env apenas).

create table if not exists public.bank_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('manual', 'bridge')),
  provider_item_id text,
  label text,
  status text not null default 'active' check (status in ('active', 'needs_reconnect', 'revoked')),
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, provider_item_id)
);

create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.bank_connections(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_account_id text,
  name text not null,
  -- Nunca IBAN completo: só os últimos 4 dígitos para exibição.
  iban_last4 text,
  currency text not null default 'EUR',
  created_at timestamptz not null default now(),
  unique (connection_id, provider_account_id)
);

create table if not exists public.bank_transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.bank_accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Dedup de sincronização/importação (re-importar não duplica).
  provider_tx_id text not null,
  date date not null,
  amount numeric(12,2) not null,
  label text not null,
  direction text not null check (direction in ('credit', 'debit')),
  -- pending: aguarda conciliação (Fase 6). confirmed/ignored/non_business via
  -- decisão humana. Cru NUNCA vira receita.
  reconcile_status text not null default 'pending'
    check (reconcile_status in ('pending', 'suggested', 'confirmed', 'ignored', 'non_business')),
  created_at timestamptz not null default now(),
  unique (account_id, provider_tx_id)
);

create table if not exists public.bank_reconciliations (
  id uuid primary key default gen_random_uuid(),
  -- unique => uma transação só concilia uma vez (anti double-count estrutural).
  transaction_id uuid not null unique references public.bank_transactions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_id uuid,
  confirmed_at timestamptz not null default now()
);

create table if not exists public.bank_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  processed_at timestamptz not null default now(),
  -- Idempotência: mesmo evento entregue 2x é ignorado.
  unique (provider, event_id)
);

alter table public.bank_connections enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.bank_transactions enable row level security;
alter table public.bank_reconciliations enable row level security;
alter table public.bank_webhook_events enable row level security;

drop policy if exists "bank_connections_select_own" on public.bank_connections;
create policy "bank_connections_select_own" on public.bank_connections for select using (auth.uid() = user_id);
drop policy if exists "bank_connections_insert_own" on public.bank_connections;
create policy "bank_connections_insert_own" on public.bank_connections for insert with check (auth.uid() = user_id);
drop policy if exists "bank_connections_update_own" on public.bank_connections;
create policy "bank_connections_update_own" on public.bank_connections for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "bank_connections_delete_own" on public.bank_connections;
create policy "bank_connections_delete_own" on public.bank_connections for delete using (auth.uid() = user_id);

drop policy if exists "bank_accounts_select_own" on public.bank_accounts;
create policy "bank_accounts_select_own" on public.bank_accounts for select using (auth.uid() = user_id);
drop policy if exists "bank_accounts_insert_own" on public.bank_accounts;
create policy "bank_accounts_insert_own" on public.bank_accounts for insert with check (auth.uid() = user_id);
drop policy if exists "bank_accounts_update_own" on public.bank_accounts;
create policy "bank_accounts_update_own" on public.bank_accounts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "bank_accounts_delete_own" on public.bank_accounts;
create policy "bank_accounts_delete_own" on public.bank_accounts for delete using (auth.uid() = user_id);

drop policy if exists "bank_transactions_select_own" on public.bank_transactions;
create policy "bank_transactions_select_own" on public.bank_transactions for select using (auth.uid() = user_id);
drop policy if exists "bank_transactions_insert_own" on public.bank_transactions;
create policy "bank_transactions_insert_own" on public.bank_transactions for insert with check (auth.uid() = user_id);
drop policy if exists "bank_transactions_update_own" on public.bank_transactions;
create policy "bank_transactions_update_own" on public.bank_transactions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "bank_transactions_delete_own" on public.bank_transactions;
create policy "bank_transactions_delete_own" on public.bank_transactions for delete using (auth.uid() = user_id);

drop policy if exists "bank_reconciliations_select_own" on public.bank_reconciliations;
create policy "bank_reconciliations_select_own" on public.bank_reconciliations for select using (auth.uid() = user_id);
drop policy if exists "bank_reconciliations_insert_own" on public.bank_reconciliations;
create policy "bank_reconciliations_insert_own" on public.bank_reconciliations for insert with check (auth.uid() = user_id);
drop policy if exists "bank_reconciliations_delete_own" on public.bank_reconciliations;
create policy "bank_reconciliations_delete_own" on public.bank_reconciliations for delete using (auth.uid() = user_id);

-- bank_webhook_events: SEM policy de usuário (só service-role escreve/lê).

create or replace trigger bank_connections_set_updated_at
before update on public.bank_connections
for each row execute function public.set_updated_at();

create index if not exists bank_accounts_user_idx on public.bank_accounts(user_id);
create index if not exists bank_transactions_user_date_idx on public.bank_transactions(user_id, date desc);
create index if not exists bank_transactions_account_idx on public.bank_transactions(account_id);
