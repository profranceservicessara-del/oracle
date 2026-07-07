-- Reconcilia drift de schema: a coluna document_lines.unite está declarada no
-- schema canônico (20260610193000_create_core_tables.sql) com default 'unité',
-- mas não existe no banco de produção. Aditivo + idempotente.
alter table public.document_lines
  add column if not exists unite text not null default 'unité';
