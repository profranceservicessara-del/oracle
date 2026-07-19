-- Agenda — suporte a "eventos" (grupo) além de compromissos individuais.
-- Aditivo e idempotente: só adiciona colunas em crm_appointments. Não altera
-- dados existentes (default 'appointment' preserva o comportamento atual).

alter table public.crm_appointments
  add column if not exists kind text not null default 'appointment';

alter table public.crm_appointments
  add column if not exists max_participants integer;

alter table public.crm_appointments
  add column if not exists prep_minutes integer not null default 0;

-- Restringe kind aos valores conhecidos (idempotente).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'crm_appointments_kind_check'
  ) then
    alter table public.crm_appointments
      add constraint crm_appointments_kind_check check (kind in ('appointment', 'event'));
  end if;
end $$;
