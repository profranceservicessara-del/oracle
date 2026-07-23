-- Modelos de documento (orçamento/fatura) reutilizáveis.
-- O usuário salva um conjunto de linhas com um nome e cria novos documentos a
-- partir dele. Espelha a forma de document_lines para a cópia ser direta.
-- Single-tenant por user_id, RLS auth.uid() = user_id. Aditiva e idempotente.

create table if not exists public.document_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null default 'facture' check (type in ('devis', 'facture')),
  description text,
  conditions_paiement text,
  notes_bas_page text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.document_templates enable row level security;
create index if not exists document_templates_user_idx on public.document_templates(user_id);

drop policy if exists "document_templates_select_own" on public.document_templates;
create policy "document_templates_select_own" on public.document_templates for select using (auth.uid() = user_id);
drop policy if exists "document_templates_insert_own" on public.document_templates;
create policy "document_templates_insert_own" on public.document_templates for insert with check (auth.uid() = user_id);
drop policy if exists "document_templates_update_own" on public.document_templates;
create policy "document_templates_update_own" on public.document_templates for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "document_templates_delete_own" on public.document_templates;
create policy "document_templates_delete_own" on public.document_templates for delete using (auth.uid() = user_id);

-- Linhas do modelo: mesmas colunas relevantes de document_lines, para que criar
-- um documento a partir do modelo seja uma cópia direta. taux_tva default 0
-- (franchise); a app define o valor, o banco não crava alíquota.
create table if not exists public.document_template_lines (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.document_templates(id) on delete cascade,
  ordre integer not null default 0,
  designation text not null,
  description text,
  quantite numeric(12, 3) not null default 1 check (quantite > 0),
  prix_unitaire_ht numeric(12, 2) not null default 0 check (prix_unitaire_ht >= 0),
  taux_tva numeric(5, 2) not null default 0 check (taux_tva >= 0),
  categorie text not null default 'service_bnc' check (categorie in ('vente', 'service_bic', 'service_bnc')),
  created_at timestamptz not null default now()
);

alter table public.document_template_lines enable row level security;
create index if not exists document_template_lines_template_idx on public.document_template_lines(template_id);

-- Sem user_id: o escopo vem do modelo pai pertencente ao usuário.
drop policy if exists "document_template_lines_select_own" on public.document_template_lines;
create policy "document_template_lines_select_own" on public.document_template_lines for select
  using (exists (select 1 from public.document_templates t where t.id = template_id and t.user_id = auth.uid()));
drop policy if exists "document_template_lines_insert_own" on public.document_template_lines;
create policy "document_template_lines_insert_own" on public.document_template_lines for insert
  with check (exists (select 1 from public.document_templates t where t.id = template_id and t.user_id = auth.uid()));
drop policy if exists "document_template_lines_update_own" on public.document_template_lines;
create policy "document_template_lines_update_own" on public.document_template_lines for update
  using (exists (select 1 from public.document_templates t where t.id = template_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.document_templates t where t.id = template_id and t.user_id = auth.uid()));
drop policy if exists "document_template_lines_delete_own" on public.document_template_lines;
create policy "document_template_lines_delete_own" on public.document_template_lines for delete
  using (exists (select 1 from public.document_templates t where t.id = template_id and t.user_id = auth.uid()));

drop trigger if exists document_templates_set_updated_at on public.document_templates;
create trigger document_templates_set_updated_at
before update on public.document_templates
for each row execute function public.set_updated_at();
