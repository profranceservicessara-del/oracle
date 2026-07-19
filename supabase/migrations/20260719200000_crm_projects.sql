-- Produtividade → Projetos: agrupa tarefas (crm_tasks) em projetos, com quadro
-- Kanban por status. Aditivo e idempotente. RLS por company (mesmo padrão crm_*).

create table if not exists public.crm_projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.crm_companies(id) on delete cascade,
  client_id uuid references public.crm_clients(id) on delete set null,
  name text not null default '',
  status text not null default 'active' check (status in ('active', 'on_hold', 'done', 'archived')),
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_projects_company_idx on public.crm_projects (company_id);

alter table public.crm_projects enable row level security;

drop policy if exists "crm_projects_all" on public.crm_projects;
create policy "crm_projects_all" on public.crm_projects
  for all to authenticated
  using (public.crm_is_company_member(company_id))
  with check (public.crm_is_company_member(company_id));

create or replace trigger crm_projects_set_updated_at
  before update on public.crm_projects
  for each row execute function public.set_updated_at();

-- Vínculo tarefa → projeto (nullable: tarefas soltas continuam funcionando).
alter table public.crm_tasks add column if not exists project_id uuid references public.crm_projects(id) on delete set null;
create index if not exists crm_tasks_project_idx on public.crm_tasks (project_id);
