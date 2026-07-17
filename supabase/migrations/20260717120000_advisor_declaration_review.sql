-- Meu Conselheiro: escalação de REVISÃO DE DECLARAÇÃO. Aditiva + idempotente.
-- Reusa advisor_requests (não cria tabela nova). Colunas nullable/default =>
-- não quebra dados nem RLS existentes. O usuário continua só podendo ler/criar
-- as próprias solicitações (sem update/delete) — status e admin_response
-- seguem protegidos (só service-role altera).

alter table public.advisor_requests
  add column if not exists kind text not null default 'support'
    check (kind in ('support', 'declaration_review'));

alter table public.advisor_requests
  add column if not exists draft_id uuid references public.urssaf_declaration_drafts(id) on delete set null;

-- Snapshot server-computed no momento da escalação (período, total, confiança,
-- pendências, perfil fiscal). NUNCA contém texto gerado pelo modelo nem dado
-- bancário. Referência/resumo, não dump financeiro completo.
alter table public.advisor_requests
  add column if not exists context jsonb;

create index if not exists advisor_requests_kind_idx on public.advisor_requests(user_id, kind);
