-- Meu Conselheiro — central de solicitações de suporte/orientação.
-- Aditiva + idempotente. Mirror das convenções de supplier_invoices:
-- gen_random_uuid, user_id -> auth.users on delete cascade, RLS por dono,
-- trigger public.set_updated_at().
--
-- Segurança: usuário só LÊ e CRIA as próprias solicitações. Ele NÃO pode
-- alterar status/admin_response (sem policy de update/delete). Respostas da
-- equipe são feitas via service-role (admin-supabase), fora do alcance do
-- usuário. Nenhum acesso público; sem exposição entre usuários.

create table if not exists public.advisor_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text,
  message text not null,
  status text not null default 'received'
    check (status in ('received', 'in_review', 'answered', 'closed')),
  admin_response text,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.advisor_requests enable row level security;

drop policy if exists "advisor_requests_select_own" on public.advisor_requests;
create policy "advisor_requests_select_own"
on public.advisor_requests
for select
using (auth.uid() = user_id);

drop policy if exists "advisor_requests_insert_own" on public.advisor_requests;
create policy "advisor_requests_insert_own"
on public.advisor_requests
for insert
with check (auth.uid() = user_id);

-- Sem policy de update/delete para o usuário: status e admin_response ficam
-- protegidos (só service-role altera).

create or replace trigger advisor_requests_set_updated_at
before update on public.advisor_requests
for each row execute function public.set_updated_at();

create index if not exists advisor_requests_user_id_idx on public.advisor_requests(user_id);
create index if not exists advisor_requests_user_created_idx on public.advisor_requests(user_id, created_at desc);
