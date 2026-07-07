-- CRM pipeline: negócios/oportunidades. Aditivo + idempotente.
-- RLS por company member (mesmo padrão das demais crm_* tables).

create table if not exists public.crm_deals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.crm_companies(id) on delete cascade,
  client_id uuid references public.crm_clients(id) on delete set null,
  title text not null,
  description text,
  value_cents integer not null default 0,
  currency text not null default 'EUR',
  stage text not null default 'lead' check (stage in ('lead', 'qualified', 'proposal', 'won', 'lost')),
  status text not null default 'open' check (status in ('open', 'won', 'lost')),
  expected_close_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_deals_company_id_idx on public.crm_deals(company_id);
create index if not exists crm_deals_client_id_idx on public.crm_deals(client_id);
create index if not exists crm_deals_stage_idx on public.crm_deals(stage);

create or replace trigger crm_deals_set_updated_at before update on public.crm_deals for each row execute function public.set_updated_at();

alter table public.crm_deals enable row level security;

drop policy if exists "crm_deals_all" on public.crm_deals;
create policy "crm_deals_all" on public.crm_deals for all to authenticated
  using (public.crm_is_company_member(company_id))
  with check (public.crm_is_company_member(company_id));
