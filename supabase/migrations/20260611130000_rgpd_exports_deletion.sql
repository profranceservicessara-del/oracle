alter table public.profiles
add column if not exists deleted_at timestamptz,
add column if not exists anonymized_at timestamptz;

create table public.rgpd_export_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  export_date date not null default current_date,
  count integer not null default 0 check (count >= 0),
  primary key (user_id, export_date)
);

alter table public.rgpd_export_rate_limits enable row level security;

create policy "rgpd_export_rate_limits_select_own"
on public.rgpd_export_rate_limits for select
to authenticated
using (user_id = auth.uid());

create table public.rgpd_deleted_account_map (
  original_user_id uuid primary key,
  anonymized_user_id uuid not null references auth.users(id),
  deleted_at timestamptz not null default now()
);

alter table public.rgpd_deleted_account_map enable row level security;

create table public.rgpd_account_deletion_requests (
  user_id uuid primary key references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now()
);

alter table public.rgpd_account_deletion_requests enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'rgpd-exports',
  'rgpd-exports',
  false,
  10485760,
  array['application/zip']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "rgpd_exports_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'rgpd-exports'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "rgpd_exports_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'rgpd-exports'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create or replace function public.check_rgpd_export_rate_limit()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentification requise';
  end if;

  insert into public.rgpd_export_rate_limits (user_id, export_date, count)
  values (v_user_id, current_date, 1)
  on conflict (user_id, export_date)
  do update set count = public.rgpd_export_rate_limits.count + 1
  returning count into v_count;

  if v_count > 2 then
    raise exception 'Limite de 2 exports par jour atteinte';
  end if;

  return v_count;
end;
$$;

do $$
declare
  v_constraint record;
begin
  for v_constraint in
    select conrelid::regclass as table_name, conname
    from pg_constraint
    where contype = 'f'
      and connamespace = 'public'::regnamespace
      and conrelid::regclass::text in (
        'public.clients',
        'public.catalog_items',
        'public.documents',
        'public.document_lines',
        'public.payments',
        'public.purchases',
        'public.sequences',
        'public.audit_log'
      )
  loop
    execute format(
      'alter table %s alter constraint %I deferrable initially immediate',
      v_constraint.table_name,
      v_constraint.conname
    );
  end loop;
end;
$$;

create or replace function public.rgpd_anonymize_account(
  p_original_user_id uuid,
  p_anonymized_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  set constraints all deferred;

  insert into public.rgpd_deleted_account_map (original_user_id, anonymized_user_id)
  values (p_original_user_id, p_anonymized_user_id)
  on conflict (original_user_id) do update
  set anonymized_user_id = excluded.anonymized_user_id,
      deleted_at = now();

  insert into public.profiles (
    id,
    nome,
    prenom,
    adresse_rue,
    adresse_cp,
    adresse_ville,
    siret,
    code_ape,
    regime_tva,
    activite_principale,
    monthly_summary_email,
    deleted_at,
    anonymized_at
  )
  values (
    p_anonymized_user_id,
    'Utilisateur anonymisé',
    null,
    null,
    null,
    null,
    null,
    null,
    'franchise',
    'service_bic',
    false,
    now(),
    now()
  )
  on conflict (id) do nothing;

  update public.clients
  set user_id = p_anonymized_user_id,
      type = 'particulier',
      nom = 'Client anonymisé',
      raison_sociale = null,
      siren = null,
      adresse_rue = null,
      adresse_cp = null,
      adresse_ville = null,
      email = null,
      telephone = null,
      notes = null,
      archived = true
  where user_id = p_original_user_id;

  update public.catalog_items
  set user_id = p_anonymized_user_id,
      archived = true
  where user_id = p_original_user_id;

  update public.document_lines
  set user_id = p_anonymized_user_id
  where user_id = p_original_user_id;

  update public.payments
  set user_id = p_anonymized_user_id,
      reference = null,
      notes = null
  where user_id = p_original_user_id;

  update public.purchases
  set user_id = p_anonymized_user_id,
      fournisseur = 'Fournisseur anonymisé',
      designation = 'Achat anonymisé',
      moyen = null,
      reference_piece = null
  where user_id = p_original_user_id;

  update public.documents
  set user_id = p_anonymized_user_id,
      notes_bas_page = null,
      pdf_path = pdf_path
  where user_id = p_original_user_id;

  update public.sequences
  set user_id = p_anonymized_user_id
  where user_id = p_original_user_id;

  update public.audit_log
  set user_id = p_anonymized_user_id,
      payload = jsonb_build_object('anonymized', true)
  where user_id = p_original_user_id;

  update public.profiles
  set nome = 'Compte supprimé',
      prenom = null,
      adresse_rue = null,
      adresse_cp = null,
      adresse_ville = null,
      siret = null,
      code_ape = null,
      logo_url = null,
      couleur_principale = null,
      monthly_summary_email = false,
      deleted_at = now(),
      anonymized_at = now()
  where id = p_original_user_id;
end;
$$;

revoke all on function public.check_rgpd_export_rate_limit() from public;
revoke all on function public.rgpd_anonymize_account(uuid, uuid) from public;

grant execute on function public.check_rgpd_export_rate_limit() to authenticated;
