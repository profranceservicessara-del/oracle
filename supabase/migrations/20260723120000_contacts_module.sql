-- Módulo Contatos (CRM paralelo). Tabelas próprias, isoladas do /crm atual.
-- Tenancy por user_id (padrão de clients/payments/documents), RLS por dono.
-- Aditiva + idempotente. Sem dados de exemplo (usuário cria os reais).

-- Third: empresa ou indivíduo (cliente, perspectiva ou fornecedor).
create table if not exists public.contact_thirds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_kind text not null default 'company' check (entity_kind in ('company', 'individual')),
  third_type text not null default 'client' check (third_type in ('client', 'prospect', 'supplier')),
  name text not null,
  reference text,
  website text,
  price_category text,
  email text,
  phone text,
  mobile text,
  fax text,
  legal_status text,
  siret text,
  siren text,
  naf_code text,
  share_capital text,
  rcs text,
  intra_vat text,
  business_sector text,
  activity_description text,
  employee_count text,
  twitter text,
  facebook text,
  linkedin text,
  instagram text,
  third_party_account text,
  subsidiary_account_code text,
  accounting_note text,
  custom_fields jsonb not null default '{}'::jsonb,
  score numeric(6, 2),
  registration_channel text,
  archived boolean not null default false,
  converted_at timestamptz,
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contact_thirds enable row level security;
create index if not exists contact_thirds_user_idx on public.contact_thirds(user_id);
create index if not exists contact_thirds_user_type_idx on public.contact_thirds(user_id, third_type);
create index if not exists contact_thirds_user_kind_idx on public.contact_thirds(user_id, entity_kind);

drop policy if exists "contact_thirds_select_own" on public.contact_thirds;
create policy "contact_thirds_select_own" on public.contact_thirds for select using (auth.uid() = user_id);
drop policy if exists "contact_thirds_insert_own" on public.contact_thirds;
create policy "contact_thirds_insert_own" on public.contact_thirds for insert with check (auth.uid() = user_id);
drop policy if exists "contact_thirds_update_own" on public.contact_thirds;
create policy "contact_thirds_update_own" on public.contact_thirds for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "contact_thirds_delete_own" on public.contact_thirds;
create policy "contact_thirds_delete_own" on public.contact_thirds for delete using (auth.uid() = user_id);

drop trigger if exists contact_thirds_set_updated_at on public.contact_thirds;
create trigger contact_thirds_set_updated_at
before update on public.contact_thirds
for each row execute function public.set_updated_at();

-- Endereços (billing/shipping/main), múltiplos por third.
create table if not exists public.contact_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  third_id uuid not null references public.contact_thirds(id) on delete cascade,
  kind text not null default 'main' check (kind in ('billing', 'shipping', 'main')),
  line1 text,
  zip_code text,
  city text,
  state text,
  country text,
  created_at timestamptz not null default now()
);

alter table public.contact_addresses enable row level security;
create index if not exists contact_addresses_third_idx on public.contact_addresses(third_id);
create index if not exists contact_addresses_user_idx on public.contact_addresses(user_id);

drop policy if exists "contact_addresses_select_own" on public.contact_addresses;
create policy "contact_addresses_select_own" on public.contact_addresses for select using (auth.uid() = user_id);
drop policy if exists "contact_addresses_insert_own" on public.contact_addresses;
create policy "contact_addresses_insert_own" on public.contact_addresses for insert with check (auth.uid() = user_id);
drop policy if exists "contact_addresses_update_own" on public.contact_addresses;
create policy "contact_addresses_update_own" on public.contact_addresses for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "contact_addresses_delete_own" on public.contact_addresses;
create policy "contact_addresses_delete_own" on public.contact_addresses for delete using (auth.uid() = user_id);

-- Contact: pessoa, opcionalmente vinculada a um third (third_id nullable).
create table if not exists public.contact_people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  third_id uuid references public.contact_thirds(id) on delete set null,
  civility text check (civility is null or civility in ('mr', 'mrs')),
  first_name text,
  last_name text,
  role text,
  email text,
  phone text,
  mobile text,
  fax text,
  birth_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contact_people enable row level security;
create index if not exists contact_people_user_idx on public.contact_people(user_id);
create index if not exists contact_people_third_idx on public.contact_people(third_id);

drop policy if exists "contact_people_select_own" on public.contact_people;
create policy "contact_people_select_own" on public.contact_people for select using (auth.uid() = user_id);
drop policy if exists "contact_people_insert_own" on public.contact_people;
create policy "contact_people_insert_own" on public.contact_people for insert with check (auth.uid() = user_id);
drop policy if exists "contact_people_update_own" on public.contact_people;
create policy "contact_people_update_own" on public.contact_people for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "contact_people_delete_own" on public.contact_people;
create policy "contact_people_delete_own" on public.contact_people for delete using (auth.uid() = user_id);

drop trigger if exists contact_people_set_updated_at on public.contact_people;
create trigger contact_people_set_updated_at
before update on public.contact_people
for each row execute function public.set_updated_at();
