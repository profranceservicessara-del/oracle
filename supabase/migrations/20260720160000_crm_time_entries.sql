-- Gestão do tempo — registro de horas (planejado × realizado) por usuário,
-- ligado opcionalmente a projeto/cliente/tarefa. Aditivo e idempotente.
-- RLS por company (mesmo padrão crm_*). Não toca em financeiro/contabilidade:
-- billable é só classificação; nenhuma fatura/pagamento é gerado.

create table if not exists public.crm_time_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.crm_companies(id) on delete cascade,
  user_id uuid not null,
  project_id uuid references public.crm_projects(id) on delete set null,
  client_id uuid references public.crm_clients(id) on delete set null,
  task_id uuid references public.crm_tasks(id) on delete set null,
  entry_type text not null default 'trabalho',
  billable boolean not null default false,
  planned_minutes integer not null default 0 check (planned_minutes >= 0),
  actual_minutes integer not null default 0 check (actual_minutes >= 0),
  entry_date date not null,
  start_time time,
  end_time time,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_time_entries_company_date_idx on public.crm_time_entries (company_id, entry_date);
create index if not exists crm_time_entries_user_idx on public.crm_time_entries (user_id);
create index if not exists crm_time_entries_project_idx on public.crm_time_entries (project_id);

alter table public.crm_time_entries enable row level security;

drop policy if exists "crm_time_entries_all" on public.crm_time_entries;
create policy "crm_time_entries_all" on public.crm_time_entries
  for all to authenticated
  using (public.crm_is_company_member(company_id))
  with check (public.crm_is_company_member(company_id));

create or replace trigger crm_time_entries_set_updated_at
  before update on public.crm_time_entries
  for each row execute function public.set_updated_at();
