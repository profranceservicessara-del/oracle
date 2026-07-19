-- Projetos → tarefas: campo "Habilidades" (skills/tags). Aditivo e idempotente.
alter table public.crm_tasks add column if not exists skills text[];
