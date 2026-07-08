-- Modelos de contrato: biblioteca do usuário. Aditivo + idempotente.
-- RLS user-scoped (mesmo padrão de documents/profiles: user_id = auth.uid()).

create table if not exists public.contract_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contract_templates_user_id_idx on public.contract_templates(user_id);

create or replace trigger contract_templates_set_updated_at before update on public.contract_templates for each row execute function public.set_updated_at();

alter table public.contract_templates enable row level security;

drop policy if exists "contract_templates_all" on public.contract_templates;
create policy "contract_templates_all" on public.contract_templates for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
