-- Projetos → tarefas: data de início (além do prazo/due_date), formando um
-- intervalo. Aditivo e idempotente.
alter table public.crm_tasks add column if not exists start_date date;
