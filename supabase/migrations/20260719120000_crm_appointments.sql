-- CRM Appointments (Agenda) — compromissos agendados no modelo company-based.
-- Aditivo e idempotente. RLS por membership (mesmo padrão dos demais crm_*).
-- Não altera nenhuma tabela existente.

create table if not exists public.crm_appointments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.crm_companies(id) on delete cascade,
  client_id uuid references public.crm_clients(id) on delete set null,
  title text not null default '',
  service text,
  color text not null default 'blue',
  status text not null default 'confirmed',
  location text,
  note text,
  price_option text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_appointments_company_start_idx on public.crm_appointments (company_id, start_at);
create index if not exists crm_appointments_client_idx on public.crm_appointments (client_id);

alter table public.crm_appointments enable row level security;

drop policy if exists "crm_appointments_all" on public.crm_appointments;
create policy "crm_appointments_all" on public.crm_appointments
  for all to authenticated
  using (public.crm_is_company_member(company_id))
  with check (public.crm_is_company_member(company_id));

create or replace trigger crm_appointments_set_updated_at
  before update on public.crm_appointments
  for each row execute function public.set_updated_at();
