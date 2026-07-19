-- Projetos → tarefas mais ricas: prioridade, descrição e subtarefas.
-- Aditivo e idempotente. parent_task_id auto-referencia crm_tasks (subtarefa).

alter table public.crm_tasks add column if not exists priority text not null default 'none';
alter table public.crm_tasks add column if not exists description text;
alter table public.crm_tasks add column if not exists parent_task_id uuid references public.crm_tasks(id) on delete cascade;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'crm_tasks_priority_check') then
    alter table public.crm_tasks
      add constraint crm_tasks_priority_check check (priority in ('none', 'low', 'medium', 'high'));
  end if;
end $$;

create index if not exists crm_tasks_parent_idx on public.crm_tasks (parent_task_id);
