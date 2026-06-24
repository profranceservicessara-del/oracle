-- CRM Core foundation (Phase 1) — additive, company-based, namespaced crm_*.
-- Does NOT touch existing profiles/clients/documents (user-based invoicing model).
-- Multi-tenant by company; access restricted to company owner or members.
-- Idempotent (safe to re-run): if not exists / or replace / drop policy if exists.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.crm_companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists crm_companies_owner_id_idx on public.crm_companies(owner_id);

create table if not exists public.crm_company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.crm_companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);
create index if not exists crm_company_members_company_id_idx on public.crm_company_members(company_id);
create index if not exists crm_company_members_user_id_idx on public.crm_company_members(user_id);

create table if not exists public.crm_clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.crm_companies(id) on delete cascade,
  type text not null default 'professionnel' check (type in ('particulier', 'professionnel')),
  name text not null,
  email text,
  phone text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists crm_clients_company_id_idx on public.crm_clients(company_id);

create table if not exists public.crm_contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.crm_companies(id) on delete cascade,
  client_id uuid not null references public.crm_clients(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  role text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists crm_contacts_company_id_idx on public.crm_contacts(company_id);
create index if not exists crm_contacts_client_id_idx on public.crm_contacts(client_id);

create table if not exists public.crm_dossiers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.crm_companies(id) on delete cascade,
  client_id uuid references public.crm_clients(id) on delete set null,
  title text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists crm_dossiers_company_id_idx on public.crm_dossiers(company_id);
create index if not exists crm_dossiers_client_id_idx on public.crm_dossiers(client_id);

create table if not exists public.crm_notes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.crm_companies(id) on delete cascade,
  client_id uuid references public.crm_clients(id) on delete set null,
  dossier_id uuid references public.crm_dossiers(id) on delete set null,
  author_id uuid references auth.users(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists crm_notes_company_id_idx on public.crm_notes(company_id);
create index if not exists crm_notes_client_id_idx on public.crm_notes(client_id);
create index if not exists crm_notes_dossier_id_idx on public.crm_notes(dossier_id);

create table if not exists public.crm_tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.crm_companies(id) on delete cascade,
  client_id uuid references public.crm_clients(id) on delete set null,
  dossier_id uuid references public.crm_dossiers(id) on delete set null,
  assignee_id uuid references auth.users(id) on delete set null,
  title text not null,
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists crm_tasks_company_id_idx on public.crm_tasks(company_id);
create index if not exists crm_tasks_client_id_idx on public.crm_tasks(client_id);
create index if not exists crm_tasks_dossier_id_idx on public.crm_tasks(dossier_id);

create table if not exists public.crm_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.crm_companies(id) on delete cascade,
  client_id uuid references public.crm_clients(id) on delete set null,
  dossier_id uuid references public.crm_dossiers(id) on delete set null,
  name text not null,
  storage_path text,
  mime_type text,
  created_at timestamptz not null default now()
);
create index if not exists crm_documents_company_id_idx on public.crm_documents(company_id);
create index if not exists crm_documents_client_id_idx on public.crm_documents(client_id);
create index if not exists crm_documents_dossier_id_idx on public.crm_documents(dossier_id);

create table if not exists public.crm_activity_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.crm_companies(id) on delete cascade,
  profile_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  entity text,
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists crm_activity_log_company_id_idx on public.crm_activity_log(company_id);
create index if not exists crm_activity_log_profile_id_idx on public.crm_activity_log(profile_id);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  -- French default; prepared for future Portuguese i18n switch.
  locale text not null default 'fr' check (locale in ('fr', 'pt')),
  theme text not null default 'light',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at triggers (reuse existing public.set_updated_at())
-- ---------------------------------------------------------------------------
create or replace trigger crm_companies_set_updated_at before update on public.crm_companies for each row execute function public.set_updated_at();
create or replace trigger crm_clients_set_updated_at before update on public.crm_clients for each row execute function public.set_updated_at();
create or replace trigger crm_contacts_set_updated_at before update on public.crm_contacts for each row execute function public.set_updated_at();
create or replace trigger crm_dossiers_set_updated_at before update on public.crm_dossiers for each row execute function public.set_updated_at();
create or replace trigger crm_notes_set_updated_at before update on public.crm_notes for each row execute function public.set_updated_at();
create or replace trigger crm_tasks_set_updated_at before update on public.crm_tasks for each row execute function public.set_updated_at();
create or replace trigger user_preferences_set_updated_at before update on public.user_preferences for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Membership helpers (security definer to avoid RLS recursion on crm tables).
-- ---------------------------------------------------------------------------
create or replace function public.crm_is_company_owner(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.crm_companies c
    where c.id = p_company_id and c.owner_id = auth.uid()
  );
$$;

create or replace function public.crm_is_company_member(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.crm_companies c
    where c.id = p_company_id and c.owner_id = auth.uid()
  ) or exists (
    select 1 from public.crm_company_members m
    where m.company_id = p_company_id and m.user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security (authenticated only; isolated by company membership)
-- ---------------------------------------------------------------------------
alter table public.crm_companies enable row level security;
alter table public.crm_company_members enable row level security;
alter table public.crm_clients enable row level security;
alter table public.crm_contacts enable row level security;
alter table public.crm_dossiers enable row level security;
alter table public.crm_notes enable row level security;
alter table public.crm_tasks enable row level security;
alter table public.crm_documents enable row level security;
alter table public.crm_activity_log enable row level security;
alter table public.user_preferences enable row level security;

drop policy if exists "crm_companies_select" on public.crm_companies;
drop policy if exists "crm_companies_insert" on public.crm_companies;
drop policy if exists "crm_companies_update" on public.crm_companies;
drop policy if exists "crm_companies_delete" on public.crm_companies;
create policy "crm_companies_select" on public.crm_companies for select to authenticated using (public.crm_is_company_member(id));
create policy "crm_companies_insert" on public.crm_companies for insert to authenticated with check (owner_id = auth.uid());
create policy "crm_companies_update" on public.crm_companies for update to authenticated using (public.crm_is_company_owner(id)) with check (public.crm_is_company_owner(id));
create policy "crm_companies_delete" on public.crm_companies for delete to authenticated using (public.crm_is_company_owner(id));

drop policy if exists "crm_company_members_select" on public.crm_company_members;
drop policy if exists "crm_company_members_insert" on public.crm_company_members;
drop policy if exists "crm_company_members_update" on public.crm_company_members;
drop policy if exists "crm_company_members_delete" on public.crm_company_members;
create policy "crm_company_members_select" on public.crm_company_members for select to authenticated using (public.crm_is_company_member(company_id));
create policy "crm_company_members_insert" on public.crm_company_members for insert to authenticated with check (public.crm_is_company_owner(company_id));
create policy "crm_company_members_update" on public.crm_company_members for update to authenticated using (public.crm_is_company_owner(company_id)) with check (public.crm_is_company_owner(company_id));
create policy "crm_company_members_delete" on public.crm_company_members for delete to authenticated using (public.crm_is_company_owner(company_id));

drop policy if exists "crm_clients_all" on public.crm_clients;
drop policy if exists "crm_contacts_all" on public.crm_contacts;
drop policy if exists "crm_dossiers_all" on public.crm_dossiers;
drop policy if exists "crm_notes_all" on public.crm_notes;
drop policy if exists "crm_tasks_all" on public.crm_tasks;
drop policy if exists "crm_documents_all" on public.crm_documents;
create policy "crm_clients_all" on public.crm_clients for all to authenticated using (public.crm_is_company_member(company_id)) with check (public.crm_is_company_member(company_id));
create policy "crm_contacts_all" on public.crm_contacts for all to authenticated using (public.crm_is_company_member(company_id)) with check (public.crm_is_company_member(company_id));
create policy "crm_dossiers_all" on public.crm_dossiers for all to authenticated using (public.crm_is_company_member(company_id)) with check (public.crm_is_company_member(company_id));
create policy "crm_notes_all" on public.crm_notes for all to authenticated using (public.crm_is_company_member(company_id)) with check (public.crm_is_company_member(company_id));
create policy "crm_tasks_all" on public.crm_tasks for all to authenticated using (public.crm_is_company_member(company_id)) with check (public.crm_is_company_member(company_id));
create policy "crm_documents_all" on public.crm_documents for all to authenticated using (public.crm_is_company_member(company_id)) with check (public.crm_is_company_member(company_id));

drop policy if exists "crm_activity_log_select" on public.crm_activity_log;
drop policy if exists "crm_activity_log_insert" on public.crm_activity_log;
create policy "crm_activity_log_select" on public.crm_activity_log for select to authenticated using (public.crm_is_company_member(company_id));
create policy "crm_activity_log_insert" on public.crm_activity_log for insert to authenticated with check (public.crm_is_company_member(company_id) and profile_id = auth.uid());

drop policy if exists "user_preferences_select" on public.user_preferences;
drop policy if exists "user_preferences_insert" on public.user_preferences;
drop policy if exists "user_preferences_update" on public.user_preferences;
drop policy if exists "user_preferences_delete" on public.user_preferences;
create policy "user_preferences_select" on public.user_preferences for select to authenticated using (user_id = auth.uid());
create policy "user_preferences_insert" on public.user_preferences for insert to authenticated with check (user_id = auth.uid());
create policy "user_preferences_update" on public.user_preferences for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "user_preferences_delete" on public.user_preferences for delete to authenticated using (user_id = auth.uid());
