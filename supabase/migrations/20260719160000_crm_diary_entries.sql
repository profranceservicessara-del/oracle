-- Agenda → Diário: além de compromissos/eventos, suporta tarefas, notas e
-- chamadas, com categoria, faturável e duração. Tudo na mesma tabela
-- crm_appointments (RLS por company já existente). Aditivo e idempotente.

alter table public.crm_appointments add column if not exists category text;
alter table public.crm_appointments add column if not exists billable boolean not null default false;
alter table public.crm_appointments add column if not exists duration_minutes integer;

-- Amplia os valores aceitos em kind (event/appointment já existentes + novos).
alter table public.crm_appointments drop constraint if exists crm_appointments_kind_check;
alter table public.crm_appointments
  add constraint crm_appointments_kind_check
  check (kind in ('appointment', 'event', 'task', 'note', 'call'));
