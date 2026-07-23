-- Módulo Compras (contas a pagar). Documentos de compra, linhas, pagamentos,
-- entrada de documentos (OCR) e contador de numeração.
-- Single-tenant por user_id (padrão do sistema), RLS por dono (auth.uid() = user_id).
-- Fornecedor referencia public.contact_thirds (third_type = 'supplier'), sem tabela nova.
-- accounting_codes é referência global read-only (só service_role escreve).
-- Aditiva + idempotente (roda via CLI em produção). Sem taxa de TVA cravada no banco.

-- ==========================================================================
-- ENUMS (guardados por pg_type)
-- ==========================================================================
do $$ begin
  if not exists (select 1 from pg_type where typname = 'purchase_document_type') then
    create type public.purchase_document_type as enum ('invoice', 'credit_note', 'order', 'delivery');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'purchase_vat_method') then
    create type public.purchase_vat_method as enum ('debit', 'collection');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'purchase_document_status') then
    create type public.purchase_document_status as enum ('draft', 'to_verify', 'validated', 'partially_paid', 'paid', 'cancelled');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'purchase_payment_method') then
    create type public.purchase_payment_method as enum ('check', 'transfer', 'card', 'cash', 'direct_debit', 'other');
  end if;
end $$;

-- ==========================================================================
-- 1. accounting_codes — referência global read-only (PCG). SEM user_id.
-- ==========================================================================
create table if not exists public.accounting_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.accounting_codes enable row level security;

-- Leitura global para qualquer usuário autenticado; escrita só via service_role.
drop policy if exists "accounting_codes_select_all" on public.accounting_codes;
create policy "accounting_codes_select_all" on public.accounting_codes for select to authenticated using (true);

-- Seed idempotente do Plan Comptable Général.
insert into public.accounting_codes (code, label) values
  ('601000', 'Compras em estoque – matérias-primas'),
  ('602600', 'Embalagem'),
  ('604000', 'Aquisição de estudos e serviços'),
  ('606100', 'Suprimentos não estocáveis'),
  ('606300', 'Manutenção e equipamentos'),
  ('607000', 'Compras de mercadorias'),
  ('609000', 'Descontos obtidos em compras'),
  ('612000', 'Arrendamento'),
  ('613000', 'Aluguéis'),
  ('615000', 'Manutenção e reparos'),
  ('616000', 'Seguros'),
  ('622000', 'Comissões de intermediação'),
  ('623000', 'Publicidade'),
  ('624100', 'Transporte sobre compras'),
  ('625000', 'Viagens'),
  ('626000', 'Correios/telecom'),
  ('627000', 'Serviços bancários'),
  ('630000', 'Impostos e taxas'),
  ('646000', 'Contribuições previdenciárias'),
  ('661000', 'Despesa com juros')
on conflict (code) do nothing;

-- ==========================================================================
-- 2. purchase_documents — cabeçalho do documento de compra.
-- ==========================================================================
create table if not exists public.purchase_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.purchase_document_type not null,
  internal_number text,
  external_number text,
  third_id uuid references public.contact_thirds(id),
  document_date date not null default current_date,
  due_date date,
  currency text not null default 'EUR',
  vat_method public.purchase_vat_method not null default 'debit',
  amounts_include_tax boolean not null default false,
  status public.purchase_document_status not null default 'draft',
  send_to_accounting boolean not null default false,
  with_delivery boolean not null default false,
  notes text,
  total_excl_tax numeric(14, 2) not null default 0,
  total_vat numeric(14, 2) not null default 0,
  total_incl_tax numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, type, internal_number)
);

alter table public.purchase_documents enable row level security;
create index if not exists purchase_documents_user_type_status_idx on public.purchase_documents(user_id, type, status);
create index if not exists purchase_documents_user_third_idx on public.purchase_documents(user_id, third_id);

drop policy if exists "purchase_documents_select_own" on public.purchase_documents;
create policy "purchase_documents_select_own" on public.purchase_documents for select using (auth.uid() = user_id);
drop policy if exists "purchase_documents_insert_own" on public.purchase_documents;
create policy "purchase_documents_insert_own" on public.purchase_documents for insert with check (auth.uid() = user_id);
drop policy if exists "purchase_documents_update_own" on public.purchase_documents;
create policy "purchase_documents_update_own" on public.purchase_documents for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "purchase_documents_delete_own" on public.purchase_documents;
create policy "purchase_documents_delete_own" on public.purchase_documents for delete using (auth.uid() = user_id);

-- ==========================================================================
-- 3. purchase_document_lines — linhas do documento (sem user_id, herda do pai).
-- ==========================================================================
create table if not exists public.purchase_document_lines (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.purchase_documents(id) on delete cascade,
  position int not null default 0,
  reference text,
  description text,
  accounting_code_id uuid references public.accounting_codes(id),
  quantity numeric(14, 4) default 1,
  amount_excl_tax numeric(14, 2) not null default 0,
  vat_rate numeric(5, 2) not null default 0,
  amount_incl_tax numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.purchase_document_lines enable row level security;
create index if not exists purchase_document_lines_document_idx on public.purchase_document_lines(document_id);

-- Sem user_id: isolamento via documento pai pertencente ao usuário.
drop policy if exists "purchase_document_lines_select_own" on public.purchase_document_lines;
create policy "purchase_document_lines_select_own" on public.purchase_document_lines for select
  using (exists (select 1 from public.purchase_documents d where d.id = document_id and d.user_id = auth.uid()));
drop policy if exists "purchase_document_lines_insert_own" on public.purchase_document_lines;
create policy "purchase_document_lines_insert_own" on public.purchase_document_lines for insert
  with check (exists (select 1 from public.purchase_documents d where d.id = document_id and d.user_id = auth.uid()));
drop policy if exists "purchase_document_lines_update_own" on public.purchase_document_lines;
create policy "purchase_document_lines_update_own" on public.purchase_document_lines for update
  using (exists (select 1 from public.purchase_documents d where d.id = document_id and d.user_id = auth.uid()))
  with check (exists (select 1 from public.purchase_documents d where d.id = document_id and d.user_id = auth.uid()));
drop policy if exists "purchase_document_lines_delete_own" on public.purchase_document_lines;
create policy "purchase_document_lines_delete_own" on public.purchase_document_lines for delete
  using (exists (select 1 from public.purchase_documents d where d.id = document_id and d.user_id = auth.uid()));

-- ==========================================================================
-- 4. purchase_payments — pagamentos aplicados a um documento.
-- ==========================================================================
create table if not exists public.purchase_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.purchase_documents(id) on delete cascade,
  reference text,
  payment_date date,
  amount numeric(14, 2) not null default 0,
  method public.purchase_payment_method default 'other',
  created_at timestamptz not null default now()
);

alter table public.purchase_payments enable row level security;
create index if not exists purchase_payments_document_idx on public.purchase_payments(document_id);

drop policy if exists "purchase_payments_select_own" on public.purchase_payments;
create policy "purchase_payments_select_own" on public.purchase_payments for select using (auth.uid() = user_id);
drop policy if exists "purchase_payments_insert_own" on public.purchase_payments;
create policy "purchase_payments_insert_own" on public.purchase_payments for insert with check (auth.uid() = user_id);
drop policy if exists "purchase_payments_update_own" on public.purchase_payments;
create policy "purchase_payments_update_own" on public.purchase_payments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "purchase_payments_delete_own" on public.purchase_payments;
create policy "purchase_payments_delete_own" on public.purchase_payments for delete using (auth.uid() = user_id);

-- ==========================================================================
-- 5. purchase_incoming — documentos recebidos (upload/OCR) a conciliar.
-- ==========================================================================
create table if not exists public.purchase_incoming (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  original_filename text,
  source text default 'upload',
  ocr_status text default 'pending',
  extracted jsonb,
  matched_document_id uuid references public.purchase_documents(id),
  status text default 'to_verify',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.purchase_incoming enable row level security;
create index if not exists purchase_incoming_user_status_idx on public.purchase_incoming(user_id, status);

drop policy if exists "purchase_incoming_select_own" on public.purchase_incoming;
create policy "purchase_incoming_select_own" on public.purchase_incoming for select using (auth.uid() = user_id);
drop policy if exists "purchase_incoming_insert_own" on public.purchase_incoming;
create policy "purchase_incoming_insert_own" on public.purchase_incoming for insert with check (auth.uid() = user_id);
drop policy if exists "purchase_incoming_update_own" on public.purchase_incoming;
create policy "purchase_incoming_update_own" on public.purchase_incoming for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "purchase_incoming_delete_own" on public.purchase_incoming;
create policy "purchase_incoming_delete_own" on public.purchase_incoming for delete using (auth.uid() = user_id);

-- ==========================================================================
-- 6. purchase_counters — contador diário de numeração por tipo.
-- ==========================================================================
create table if not exists public.purchase_counters (
  user_id uuid not null,
  type public.purchase_document_type not null,
  day date not null,
  seq int not null default 0,
  primary key (user_id, type, day)
);

alter table public.purchase_counters enable row level security;

-- Gravações vêm de trigger SECURITY DEFINER, mas mantemos RLS por dono.
drop policy if exists "purchase_counters_select_own" on public.purchase_counters;
create policy "purchase_counters_select_own" on public.purchase_counters for select using (auth.uid() = user_id);
drop policy if exists "purchase_counters_insert_own" on public.purchase_counters;
create policy "purchase_counters_insert_own" on public.purchase_counters for insert with check (auth.uid() = user_id);
drop policy if exists "purchase_counters_update_own" on public.purchase_counters;
create policy "purchase_counters_update_own" on public.purchase_counters for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "purchase_counters_delete_own" on public.purchase_counters;
create policy "purchase_counters_delete_own" on public.purchase_counters for delete using (auth.uid() = user_id);

-- ==========================================================================
-- FUNÇÕES / TRIGGERS
-- ==========================================================================

-- Gera internal_number sequencial por (user, tipo, dia) quando não informado.
create or replace function public.fn_purchase_gen_internal_number()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_prefix text;
  v_seq int;
  v_day date := current_date;
begin
  if new.internal_number is not null then
    return new;
  end if;

  v_prefix := case new.type
    when 'invoice' then 'F_INV'
    when 'credit_note' then 'F_AV'
    when 'order' then 'PO'
    when 'delivery' then 'BL'
    else 'DOC'
  end;

  -- Serializa a numeração dentro da transação por user||type||day.
  perform pg_advisory_xact_lock(hashtext(new.user_id::text || new.type::text || v_day::text));

  insert into public.purchase_counters (user_id, type, day, seq)
  values (new.user_id, new.type, v_day, 1)
  on conflict (user_id, type, day)
  do update set seq = public.purchase_counters.seq + 1
  returning seq into v_seq;

  new.internal_number := v_prefix || '-' || to_char(v_day, 'YYYYMMDD') || '-' || lpad(v_seq::text, 5, '0');
  return new;
end;
$$;

drop trigger if exists purchase_documents_gen_internal_number on public.purchase_documents;
create trigger purchase_documents_gen_internal_number
before insert on public.purchase_documents
for each row execute function public.fn_purchase_gen_internal_number();

-- Calcula o par HT/TTC de cada linha conforme amounts_include_tax do pai.
create or replace function public.fn_purchase_calc_line()
returns trigger
language plpgsql
as $$
declare
  v_include_tax boolean;
begin
  select amounts_include_tax into v_include_tax
  from public.purchase_documents
  where id = new.document_id;

  if v_include_tax then
    new.amount_excl_tax := round(new.amount_incl_tax / (1 + new.vat_rate / 100), 2);
  else
    new.amount_incl_tax := round(new.amount_excl_tax * (1 + new.vat_rate / 100), 2);
  end if;

  return new;
end;
$$;

drop trigger if exists purchase_document_lines_calc on public.purchase_document_lines;
create trigger purchase_document_lines_calc
before insert or update on public.purchase_document_lines
for each row execute function public.fn_purchase_calc_line();

-- Recalcula os totais do documento a cada mudança de linha.
create or replace function public.fn_purchase_recalc_totals()
returns trigger
language plpgsql
as $$
declare
  v_doc uuid := coalesce(new.document_id, old.document_id);
begin
  update public.purchase_documents d
  set total_excl_tax = coalesce(t.sum_excl, 0),
      total_incl_tax = coalesce(t.sum_incl, 0),
      total_vat = coalesce(t.sum_incl, 0) - coalesce(t.sum_excl, 0)
  from (
    select sum(amount_excl_tax) as sum_excl, sum(amount_incl_tax) as sum_incl
    from public.purchase_document_lines
    where document_id = v_doc
  ) t
  where d.id = v_doc;

  return null;
end;
$$;

drop trigger if exists purchase_document_lines_recalc on public.purchase_document_lines;
create trigger purchase_document_lines_recalc
after insert or update or delete on public.purchase_document_lines
for each row execute function public.fn_purchase_recalc_totals();

-- Imutabilidade também no nível da linha: doc efetivado não permite mexer nas linhas.
create or replace function public.fn_purchase_lines_guard()
returns trigger
language plpgsql
as $$
declare
  v_status public.purchase_document_status;
  v_doc uuid := coalesce(new.document_id, old.document_id);
begin
  select status into v_status from public.purchase_documents where id = v_doc;
  if v_status in ('validated', 'partially_paid', 'paid') then
    raise exception 'Documento de compra com status % não permite alterar as linhas', v_status;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists purchase_document_lines_guard on public.purchase_document_lines;
create trigger purchase_document_lines_guard
before insert or update or delete on public.purchase_document_lines
for each row execute function public.fn_purchase_lines_guard();

-- Ajusta o status do documento conforme o total pago.
create or replace function public.fn_purchase_payment_status()
returns trigger
language plpgsql
as $$
declare
  v_doc uuid := coalesce(new.document_id, old.document_id);
  v_paid numeric(14, 2);
  v_total numeric(14, 2);
  v_status public.purchase_document_status;
begin
  select status, total_incl_tax into v_status, v_total
  from public.purchase_documents
  where id = v_doc;

  -- Pagamento só altera o status de documento já validado (ou além).
  if v_status not in ('validated', 'partially_paid', 'paid') then
    return null;
  end if;

  select coalesce(sum(amount), 0) into v_paid
  from public.purchase_payments
  where document_id = v_doc;

  if v_total > 0 and v_paid >= v_total then
    update public.purchase_documents set status = 'paid' where id = v_doc;
  elsif v_paid > 0 and v_paid < v_total then
    update public.purchase_documents set status = 'partially_paid' where id = v_doc;
  elsif v_paid = 0 and v_status in ('paid', 'partially_paid') then
    update public.purchase_documents set status = 'validated' where id = v_doc;
  end if;

  return null;
end;
$$;

drop trigger if exists purchase_payments_status on public.purchase_payments;
create trigger purchase_payments_status
after insert or update or delete on public.purchase_payments
for each row execute function public.fn_purchase_payment_status();

-- Só aceita pagamento em documento validado (ou além). Bloqueia lançar em draft/to_verify/cancelled.
create or replace function public.fn_purchase_payment_guard()
returns trigger
language plpgsql
as $$
declare
  v_status public.purchase_document_status;
begin
  select status into v_status from public.purchase_documents where id = new.document_id;
  if v_status is null or v_status not in ('validated', 'partially_paid', 'paid') then
    raise exception 'Só é possível registrar pagamento em documento validado (status atual: %)', coalesce(v_status::text, 'inexistente');
  end if;
  return new;
end;
$$;

drop trigger if exists purchase_payments_guard on public.purchase_payments;
create trigger purchase_payments_guard
before insert or update on public.purchase_payments
for each row execute function public.fn_purchase_payment_guard();

-- Protege documentos já efetivados contra exclusão e alteração de campos sensíveis.
create or replace function public.fn_purchase_guard_immutability()
returns trigger
language plpgsql
as $$
begin
  if old.status not in ('validated', 'paid', 'partially_paid') then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'DELETE' then
    raise exception 'Não é possível excluir um documento de compra com status %', old.status;
  end if;

  -- UPDATE: bloqueia mudança de campos financeiros/identidade.
  if new.third_id is distinct from old.third_id
     or new.document_date is distinct from old.document_date
     or new.currency is distinct from old.currency
     or new.vat_method is distinct from old.vat_method
     or new.amounts_include_tax is distinct from old.amounts_include_tax
     or new.type is distinct from old.type
     or new.internal_number is distinct from old.internal_number then
    raise exception 'Documento de compra com status % não permite alterar campos de identidade/financeiros', old.status;
  end if;

  return new;
end;
$$;

drop trigger if exists purchase_documents_guard on public.purchase_documents;
create trigger purchase_documents_guard
before update or delete on public.purchase_documents
for each row execute function public.fn_purchase_guard_immutability();

-- Triggers de updated_at (função compartilhada public.set_updated_at).
drop trigger if exists purchase_documents_set_updated_at on public.purchase_documents;
create trigger purchase_documents_set_updated_at
before update on public.purchase_documents
for each row execute function public.set_updated_at();

drop trigger if exists purchase_document_lines_set_updated_at on public.purchase_document_lines;
create trigger purchase_document_lines_set_updated_at
before update on public.purchase_document_lines
for each row execute function public.set_updated_at();

drop trigger if exists purchase_incoming_set_updated_at on public.purchase_incoming;
create trigger purchase_incoming_set_updated_at
before update on public.purchase_incoming
for each row execute function public.set_updated_at();
