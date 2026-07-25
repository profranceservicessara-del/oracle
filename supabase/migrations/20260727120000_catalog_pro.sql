-- Catálogo pro: estende a base de itens já existente (catalog_items, usada pelo
-- editor de documentos) com variações, listas de preço, promoções, fotos,
-- especificações e categorias. Single-tenant por user_id, RLS por dono.
-- Aditiva e idempotente: colunas novas têm default, então o editor de faturas e
-- os itens atuais seguem funcionando sem alteração.
-- Não crava alíquota de TVA (vat_rate default 0; a app define). Códigos de venda
-- 7xx acrescentados ao catálogo de contas de referência.

-- ==========================================================================
-- ENUMS (novos, guardados)
-- ==========================================================================
do $$ begin
  if not exists (select 1 from pg_type where typname = 'promotion_kind') then
    create type public.promotion_kind as enum ('catalog', 'promo_code');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'promotion_status') then
    create type public.promotion_status as enum ('scheduled', 'active', 'expired', 'disabled');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'discount_type') then
    create type public.discount_type as enum ('percent', 'fixed_amount', 'fixed_price');
  end if;
end $$;

-- ==========================================================================
-- 1. item_categories — categorias de produto, hierárquicas.
-- ==========================================================================
create table if not exists public.item_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.item_categories(id) on delete set null,
  name text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.item_categories enable row level security;
create index if not exists item_categories_user_idx on public.item_categories(user_id);

drop policy if exists "item_categories_all_own" on public.item_categories;
create policy "item_categories_all_own" on public.item_categories for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ==========================================================================
-- 2. Extensão de catalog_items (colunas novas, todas com default).
-- ==========================================================================
alter table public.catalog_items
  add column if not exists item_kind text not null default 'product' check (item_kind in ('product', 'service')),
  add column if not exists reference text,
  add column if not exists barcode text,
  add column if not exists vat_rate numeric(6, 4) not null default 0,
  add column if not exists price_amount_mode text not null default 'ht' check (price_amount_mode in ('ht', 'ttc')),
  add column if not exists purchase_price_excl_vat numeric(14, 4) not null default 0,
  add column if not exists sales_accounting_code text default '701000',
  add column if not exists purchase_accounting_code text default '601000',
  add column if not exists category_id uuid references public.item_categories(id) on delete set null,
  add column if not exists has_variants boolean not null default false,
  add column if not exists usual_quantity numeric(14, 4) not null default 1,
  add column if not exists append_name_to_description boolean not null default false,
  add column if not exists note text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists catalog_items_reference_idx on public.catalog_items(user_id, reference);
create index if not exists catalog_items_category_idx on public.catalog_items(category_id);

drop trigger if exists catalog_items_set_updated_at on public.catalog_items;
create trigger catalog_items_set_updated_at
before update on public.catalog_items
for each row execute function public.set_updated_at();

-- ==========================================================================
-- 3. Variações: eixos, valores, e as declinações concretas (SKU).
-- ==========================================================================
create table if not exists public.variant_axes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
alter table public.variant_axes enable row level security;
drop policy if exists "variant_axes_all_own" on public.variant_axes;
create policy "variant_axes_all_own" on public.variant_axes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.variant_values (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  axis_id uuid not null references public.variant_axes(id) on delete cascade,
  value text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.variant_values enable row level security;
create index if not exists variant_values_axis_idx on public.variant_values(axis_id);
drop policy if exists "variant_values_all_own" on public.variant_values;
create policy "variant_values_all_own" on public.variant_values for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.item_variants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.catalog_items(id) on delete cascade,
  sku text,
  barcode text,
  reference_price numeric(14, 4),
  purchase_price_excl_vat numeric(14, 4),
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.item_variants enable row level security;
create index if not exists item_variants_item_idx on public.item_variants(item_id);
drop policy if exists "item_variants_all_own" on public.item_variants;
create policy "item_variants_all_own" on public.item_variants for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.item_variant_values (
  variant_id uuid not null references public.item_variants(id) on delete cascade,
  value_id uuid not null references public.variant_values(id) on delete cascade,
  primary key (variant_id, value_id)
);
alter table public.item_variant_values enable row level security;
drop policy if exists "item_variant_values_all_own" on public.item_variant_values;
create policy "item_variant_values_all_own" on public.item_variant_values for all
  using (exists (select 1 from public.item_variants v where v.id = variant_id and v.user_id = auth.uid()))
  with check (exists (select 1 from public.item_variants v where v.id = variant_id and v.user_id = auth.uid()));

-- ==========================================================================
-- 4. Listas de preço (categorias tarifárias) e preços por item/variação.
-- ==========================================================================
create table if not exists public.price_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount_mode text not null default 'ht' check (amount_mode in ('ht', 'ttc')),
  created_at timestamptz not null default now()
);
alter table public.price_lists enable row level security;
drop policy if exists "price_lists_all_own" on public.price_lists;
create policy "price_lists_all_own" on public.price_lists for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.item_prices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.catalog_items(id) on delete cascade,
  variant_id uuid references public.item_variants(id) on delete cascade,
  price_list_id uuid not null references public.price_lists(id) on delete cascade,
  price numeric(14, 4) not null,
  created_at timestamptz not null default now()
);
alter table public.item_prices enable row level security;
create index if not exists item_prices_item_idx on public.item_prices(item_id);
-- Unicidade por item + variação + lista. coalesce trata a variação nula.
create unique index if not exists item_prices_unique_idx on public.item_prices
  (item_id, coalesce(variant_id, '00000000-0000-0000-0000-000000000000'::uuid), price_list_id);
drop policy if exists "item_prices_all_own" on public.item_prices;
create policy "item_prices_all_own" on public.item_prices for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ==========================================================================
-- 5. Fotos, arquivos e especificações do item.
-- ==========================================================================
create table if not exists public.item_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.catalog_items(id) on delete cascade,
  storage_path text not null,
  position int not null default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.item_photos enable row level security;
create index if not exists item_photos_item_idx on public.item_photos(item_id);
drop policy if exists "item_photos_all_own" on public.item_photos;
create policy "item_photos_all_own" on public.item_photos for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.item_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.catalog_items(id) on delete cascade,
  storage_path text not null,
  filename text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);
alter table public.item_files enable row level security;
create index if not exists item_files_item_idx on public.item_files(item_id);
drop policy if exists "item_files_all_own" on public.item_files;
create policy "item_files_all_own" on public.item_files for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.item_specifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.catalog_items(id) on delete cascade,
  label text not null,
  value text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.item_specifications enable row level security;
create index if not exists item_specifications_item_idx on public.item_specifications(item_id);
drop policy if exists "item_specifications_all_own" on public.item_specifications;
create policy "item_specifications_all_own" on public.item_specifications for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ==========================================================================
-- 6. Promoções (catálogo e código) e seus alvos.
-- ==========================================================================
create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind public.promotion_kind not null default 'catalog',
  name text not null,
  description text,
  insert_note_in_documents boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  never_expires boolean not null default false,
  usable_on_sales_documents boolean not null default true,
  status public.promotion_status not null default 'scheduled',
  code text,
  discount_type public.discount_type not null default 'percent',
  discount_value numeric(14, 4) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.promotions enable row level security;
create index if not exists promotions_user_idx on public.promotions(user_id);
drop policy if exists "promotions_all_own" on public.promotions;
create policy "promotions_all_own" on public.promotions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists promotions_set_updated_at on public.promotions;
create trigger promotions_set_updated_at
before update on public.promotions
for each row execute function public.set_updated_at();

create table if not exists public.promotion_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  target_type text not null check (target_type in ('item', 'category', 'all')),
  target_id uuid,
  created_at timestamptz not null default now()
);
alter table public.promotion_targets enable row level security;
create index if not exists promotion_targets_promo_idx on public.promotion_targets(promotion_id);
drop policy if exists "promotion_targets_all_own" on public.promotion_targets;
create policy "promotion_targets_all_own" on public.promotion_targets for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ==========================================================================
-- 7. has_variants sincronizado com a existência de item_variants.
-- ==========================================================================
create or replace function public.fn_sync_item_has_variants()
returns trigger
language plpgsql
as $$
declare
  v_item uuid := coalesce(new.item_id, old.item_id);
begin
  update public.catalog_items c
  set has_variants = exists (select 1 from public.item_variants v where v.item_id = v_item)
  where c.id = v_item;
  return null;
end;
$$;

drop trigger if exists item_variants_sync_flag on public.item_variants;
create trigger item_variants_sync_flag
after insert or delete on public.item_variants
for each row execute function public.fn_sync_item_has_variants();

-- ==========================================================================
-- 8. Seed dos códigos contábeis de VENDA (7xx) na tabela de referência.
-- ==========================================================================
insert into public.accounting_codes (code, label) values
  ('701000', 'Vendas de produtos acabados'),
  ('706000', 'Prestações de serviços'),
  ('707000', 'Vendas de mercadorias'),
  ('708500', 'Portes e custos de envio faturados'),
  ('709000', 'Descontos e abatimentos concedidos')
on conflict (code) do nothing;

-- ==========================================================================
-- STORAGE: bucket privado para fotos e arquivos de item, path {user_id}/...
-- ==========================================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('item-media', 'item-media', false, 10485760)
on conflict (id) do nothing;

drop policy if exists "item_media_read_own" on storage.objects;
create policy "item_media_read_own" on storage.objects for select to authenticated
  using (bucket_id = 'item-media' and (storage.foldername(name))[1]::uuid = auth.uid());
drop policy if exists "item_media_insert_own" on storage.objects;
create policy "item_media_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'item-media' and (storage.foldername(name))[1]::uuid = auth.uid());
drop policy if exists "item_media_delete_own" on storage.objects;
create policy "item_media_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'item-media' and (storage.foldername(name))[1]::uuid = auth.uid());
