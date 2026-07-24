-- Módulo Diário: agenda de eventos com recorrência, colaboradores, lembretes e
-- anexos. Single-tenant por user_id (padrão do sistema), RLS por dono, com
-- leitura/escrita estendida a colaboradores.
-- Aditiva e idempotente. Convive com crm_appointments, que segue intocada.
--
-- Nomes de coluna: evito `interval` e `offset` (palavras reservadas no Postgres,
-- que exigiriam aspas em toda consulta) usando repeat_every e offset_kind.

-- ==========================================================================
-- ENUMS
-- ==========================================================================
do $$ begin
  if not exists (select 1 from pg_type where typname = 'event_visibility') then
    create type public.event_visibility as enum ('public', 'private');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'recur_frequency') then
    create type public.recur_frequency as enum ('daily', 'weekly', 'monthly', 'yearly');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'recur_end_type') then
    create type public.recur_end_type as enum ('after_count', 'on_date', 'never');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'event_related_kind') then
    create type public.event_related_kind as enum
      ('none', 'company', 'contact', 'product', 'sales_document', 'purchase', 'opportunity');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'reminder_offset') then
    create type public.reminder_offset as enum
      ('same_day', 'prev_5min', 'prev_15min', 'prev_30min',
       'prev_hour', 'prev_day', 'prev_week', 'prev_month');
  end if;
end $$;

-- ==========================================================================
-- 1. event_categories — rótulos. user_id nulo = categoria de sistema (todos leem).
-- ==========================================================================
create table if not exists public.event_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  emoji text,
  color text not null default '#4A63C8',
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.event_categories enable row level security;
create index if not exists event_categories_user_idx on public.event_categories(user_id);

drop policy if exists "event_categories_select" on public.event_categories;
create policy "event_categories_select" on public.event_categories for select
  using (user_id is null or auth.uid() = user_id);
drop policy if exists "event_categories_insert_own" on public.event_categories;
create policy "event_categories_insert_own" on public.event_categories for insert with check (auth.uid() = user_id);
drop policy if exists "event_categories_update_own" on public.event_categories;
create policy "event_categories_update_own" on public.event_categories for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "event_categories_delete_own" on public.event_categories;
create policy "event_categories_delete_own" on public.event_categories for delete using (auth.uid() = user_id);

-- Seed das categorias de sistema (idempotente pelo nome, só as com user_id nulo).
insert into public.event_categories (user_id, name, emoji, color, is_system)
select v.user_id, v.name, v.emoji, v.color, true
from (values
  (null::uuid, 'Reunião / Agendamento com o cliente', '📅', '#4A63C8'),
  (null::uuid, 'Viagens', '🚗', '#0E9F6E'),
  (null::uuid, 'Entrega', '📦', '#D97706')
) as v(user_id, name, emoji, color)
where not exists (
  select 1 from public.event_categories c where c.user_id is null and c.name = v.name
);

-- ==========================================================================
-- 2. event_recurrences — regra de repetição (estilo RRULE).
-- ==========================================================================
create table if not exists public.event_recurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  frequency public.recur_frequency not null,
  repeat_every int not null default 1 check (repeat_every >= 1),
  by_weekday int[],
  by_monthday int[],
  by_month int[],
  end_type public.recur_end_type not null default 'never',
  occurrence_count int,
  until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recurrence_end_config check (
    (end_type = 'after_count' and occurrence_count is not null) or
    (end_type = 'on_date' and until is not null) or
    (end_type = 'never')
  )
);

alter table public.event_recurrences enable row level security;

drop policy if exists "event_recurrences_select_own" on public.event_recurrences;
create policy "event_recurrences_select_own" on public.event_recurrences for select using (auth.uid() = user_id);
drop policy if exists "event_recurrences_insert_own" on public.event_recurrences;
create policy "event_recurrences_insert_own" on public.event_recurrences for insert with check (auth.uid() = user_id);
drop policy if exists "event_recurrences_update_own" on public.event_recurrences;
create policy "event_recurrences_update_own" on public.event_recurrences for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "event_recurrences_delete_own" on public.event_recurrences;
create policy "event_recurrences_delete_own" on public.event_recurrences for delete using (auth.uid() = user_id);

-- ==========================================================================
-- 3. events — o evento (e os overrides de ocorrência).
-- ==========================================================================
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.event_categories(id) on delete set null,
  title text not null,
  description text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  visibility public.event_visibility not null default 'public',
  related_kind public.event_related_kind not null default 'none',
  related_id uuid,
  is_recurring boolean not null default false,
  recurrence_id uuid references public.event_recurrences(id) on delete set null,
  recurrence_parent_id uuid references public.events(id) on delete cascade,
  occurrence_original_start timestamptz,
  is_cancelled_occurrence boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ends_after_starts check (ends_at >= starts_at)
);

alter table public.events enable row level security;
create index if not exists events_user_range_idx on public.events(user_id, starts_at, ends_at);
create index if not exists events_related_idx on public.events(related_kind, related_id);
create index if not exists events_recurrence_parent_idx on public.events(recurrence_parent_id);

-- As policies de events ficam logo após event_collaborators, porque dependem
-- dela (dono ou colaborador convidado).

-- ==========================================================================
-- 4. event_collaborators
-- ==========================================================================
create table if not exists public.event_collaborators (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  can_edit boolean not null default false,
  response text not null default 'pending' check (response in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

alter table public.event_collaborators enable row level security;
create index if not exists event_collaborators_user_idx on public.event_collaborators(user_id);

-- O próprio colaborador enxerga a sua linha; o dono do evento enxerga todas.
drop policy if exists "event_collaborators_select" on public.event_collaborators;
create policy "event_collaborators_select" on public.event_collaborators for select using (
  auth.uid() = user_id
  or exists (select 1 from public.events e where e.id = event_id and e.user_id = auth.uid())
);
drop policy if exists "event_collaborators_write_owner" on public.event_collaborators;
create policy "event_collaborators_write_owner" on public.event_collaborators for all using (
  exists (select 1 from public.events e where e.id = event_id and e.user_id = auth.uid())
) with check (
  exists (select 1 from public.events e where e.id = event_id and e.user_id = auth.uid())
);

-- Policies de events (dependem de event_collaborators, criada acima).
-- Leitura: dono, ou colaborador convidado. Quem não é nenhum dos dois não vê.
drop policy if exists "events_select" on public.events;
create policy "events_select" on public.events for select using (
  auth.uid() = user_id
  or exists (select 1 from public.event_collaborators c where c.event_id = events.id and c.user_id = auth.uid())
);
drop policy if exists "events_insert_own" on public.events;
create policy "events_insert_own" on public.events for insert with check (auth.uid() = user_id);
drop policy if exists "events_update" on public.events;
create policy "events_update" on public.events for update using (
  auth.uid() = user_id
  or exists (select 1 from public.event_collaborators c
             where c.event_id = events.id and c.user_id = auth.uid() and c.can_edit)
) with check (
  auth.uid() = user_id
  or exists (select 1 from public.event_collaborators c
             where c.event_id = events.id and c.user_id = auth.uid() and c.can_edit)
);
drop policy if exists "events_delete" on public.events;
create policy "events_delete" on public.events for delete using (
  auth.uid() = user_id
  or exists (select 1 from public.event_collaborators c
             where c.event_id = events.id and c.user_id = auth.uid() and c.can_edit)
);

-- ==========================================================================
-- 5. event_reminders — antecedência fixa (enum), e-mail via cron existente.
-- ==========================================================================
create table if not exists public.event_reminders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  offset_kind public.reminder_offset not null,
  channel text not null default 'email',
  scheduled_for timestamptz,
  sent boolean not null default false,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, offset_kind)
);

alter table public.event_reminders enable row level security;
create index if not exists event_reminders_due_idx on public.event_reminders(sent, scheduled_for);

drop policy if exists "event_reminders_all_owner" on public.event_reminders;
create policy "event_reminders_all_owner" on public.event_reminders for all using (
  exists (select 1 from public.events e where e.id = event_id and e.user_id = auth.uid())
) with check (
  exists (select 1 from public.events e where e.id = event_id and e.user_id = auth.uid())
);

-- ==========================================================================
-- 6. event_attachments
-- ==========================================================================
create table if not exists public.event_attachments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  storage_path text not null,
  filename text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

alter table public.event_attachments enable row level security;
create index if not exists event_attachments_event_idx on public.event_attachments(event_id);

drop policy if exists "event_attachments_all_owner" on public.event_attachments;
create policy "event_attachments_all_owner" on public.event_attachments for all using (
  exists (select 1 from public.events e where e.id = event_id and e.user_id = auth.uid())
) with check (
  exists (select 1 from public.events e where e.id = event_id and e.user_id = auth.uid())
);

-- ==========================================================================
-- FUNÇÕES / TRIGGERS
-- ==========================================================================

-- Calcula quando o lembrete deve disparar, a partir da antecedência e do início
-- do evento. same_day = 08:00 do dia do evento, no fuso do banco.
create or replace function public.fn_event_reminder_schedule()
returns trigger
language plpgsql
as $$
declare
  v_start timestamptz;
begin
  select starts_at into v_start from public.events where id = new.event_id;
  if v_start is null then
    return new;
  end if;

  new.scheduled_for := case new.offset_kind
    when 'same_day'   then date_trunc('day', v_start) + interval '8 hours'
    when 'prev_5min'  then v_start - interval '5 minutes'
    when 'prev_15min' then v_start - interval '15 minutes'
    when 'prev_30min' then v_start - interval '30 minutes'
    when 'prev_hour'  then v_start - interval '1 hour'
    when 'prev_day'   then v_start - interval '1 day'
    when 'prev_week'  then v_start - interval '7 days'
    when 'prev_month' then v_start - interval '1 month'
  end;
  return new;
end;
$$;

drop trigger if exists event_reminders_schedule on public.event_reminders;
create trigger event_reminders_schedule
before insert or update on public.event_reminders
for each row execute function public.fn_event_reminder_schedule();

-- Se o evento mudar de horário, reprograma os lembretes ainda não enviados.
create or replace function public.fn_event_reschedule_reminders()
returns trigger
language plpgsql
as $$
begin
  if new.starts_at is distinct from old.starts_at then
    update public.event_reminders
    set scheduled_for = case offset_kind
      when 'same_day'   then date_trunc('day', new.starts_at) + interval '8 hours'
      when 'prev_5min'  then new.starts_at - interval '5 minutes'
      when 'prev_15min' then new.starts_at - interval '15 minutes'
      when 'prev_30min' then new.starts_at - interval '30 minutes'
      when 'prev_hour'  then new.starts_at - interval '1 hour'
      when 'prev_day'   then new.starts_at - interval '1 day'
      when 'prev_week'  then new.starts_at - interval '7 days'
      when 'prev_month' then new.starts_at - interval '1 month'
    end
    where event_id = new.id and sent = false;
  end if;
  return new;
end;
$$;

drop trigger if exists events_reschedule_reminders on public.events;
create trigger events_reschedule_reminders
after update on public.events
for each row execute function public.fn_event_reschedule_reminders();

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

drop trigger if exists event_categories_set_updated_at on public.event_categories;
create trigger event_categories_set_updated_at
before update on public.event_categories
for each row execute function public.set_updated_at();

drop trigger if exists event_recurrences_set_updated_at on public.event_recurrences;
create trigger event_recurrences_set_updated_at
before update on public.event_recurrences
for each row execute function public.set_updated_at();

-- ==========================================================================
-- STORAGE: bucket privado para anexos, path {user_id}/...
-- ==========================================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('event-attachments', 'event-attachments', false, 10485760)
on conflict (id) do nothing;

drop policy if exists "event_attachments_read_own" on storage.objects;
create policy "event_attachments_read_own" on storage.objects for select to authenticated
  using (bucket_id = 'event-attachments' and (storage.foldername(name))[1]::uuid = auth.uid());
drop policy if exists "event_attachments_insert_own" on storage.objects;
create policy "event_attachments_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'event-attachments' and (storage.foldername(name))[1]::uuid = auth.uid());
drop policy if exists "event_attachments_delete_own" on storage.objects;
create policy "event_attachments_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'event-attachments' and (storage.foldername(name))[1]::uuid = auth.uid());
