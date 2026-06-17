insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  10485760,
  array['application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "documents_storage_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "documents_storage_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "documents_storage_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create table public.email_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  count integer not null default 0 check (count >= 0),
  primary key (user_id, window_start)
);

alter table public.email_rate_limits enable row level security;

create policy "email_rate_limits_select_own"
on public.email_rate_limits for select
to authenticated
using (user_id = auth.uid());

create table public.pdf_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  count integer not null default 0 check (count >= 0),
  primary key (user_id, window_start)
);

alter table public.pdf_rate_limits enable row level security;

create policy "pdf_rate_limits_select_own"
on public.pdf_rate_limits for select
to authenticated
using (user_id = auth.uid());

create or replace function public.check_email_rate_limit()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_window timestamptz := date_trunc('hour', now());
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentification requise';
  end if;

  insert into public.email_rate_limits (user_id, window_start, count)
  values (v_user_id, v_window, 1)
  on conflict (user_id, window_start)
  do update set count = public.email_rate_limits.count + 1
  returning count into v_count;

  if v_count > 30 then
    raise exception 'Limite de 30 emails par heure atteinte';
  end if;

  return v_count;
end;
$$;

create or replace function public.check_pdf_rate_limit()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_window timestamptz := date_trunc('hour', now());
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentification requise';
  end if;

  insert into public.pdf_rate_limits (user_id, window_start, count)
  values (v_user_id, v_window, 1)
  on conflict (user_id, window_start)
  do update set count = public.pdf_rate_limits.count + 1
  returning count into v_count;

  if v_count > 30 then
    raise exception 'Limite de 30 générations PDF par heure atteinte';
  end if;

  return v_count;
end;
$$;

create or replace function public.log_email_send(
  p_document_id uuid,
  p_to_email text,
  p_subject text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_document public.documents%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentification requise';
  end if;

  select *
  into v_document
  from public.documents
  where id = p_document_id
    and user_id = v_user_id;

  if not found then
    raise exception 'Document introuvable';
  end if;

  perform public.insert_audit_log(
    v_user_id,
    'document.email_send',
    'documents',
    p_document_id,
    jsonb_build_object('to', p_to_email, 'subject', p_subject, 'numero', v_document.numero)
  );
end;
$$;

create or replace function public.convert_devis_to_facture(p_devis_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_devis public.documents%rowtype;
  v_facture_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentification requise';
  end if;

  select *
  into v_devis
  from public.documents
  where id = p_devis_id
    and user_id = v_user_id
    and type = 'devis';

  if not found then
    raise exception 'Devis introuvable';
  end if;

  if v_devis.status <> 'accepted' then
    raise exception 'Conversion autorisée uniquement pour un devis accepté';
  end if;

  insert into public.documents (
    user_id,
    client_id,
    type,
    status,
    date_emission,
    date_echeance,
    date_prestation,
    total_ht,
    total_tva,
    total_ttc,
    mention_tva,
    conditions_paiement,
    notes_bas_page,
    source_devis_id
  )
  values (
    v_devis.user_id,
    v_devis.client_id,
    'facture',
    'draft',
    current_date,
    current_date + 30,
    v_devis.date_prestation,
    v_devis.total_ht,
    v_devis.total_tva,
    v_devis.total_ttc,
    v_devis.mention_tva,
    v_devis.conditions_paiement,
    v_devis.notes_bas_page,
    v_devis.id
  )
  returning id into v_facture_id;

  insert into public.document_lines (
    document_id,
    user_id,
    ordre,
    designation,
    description,
    quantite,
    prix_unitaire_ht,
    taux_tva,
    categorie,
    total_ligne_ht
  )
  select
    v_facture_id,
    user_id,
    ordre,
    designation,
    description,
    quantite,
    prix_unitaire_ht,
    taux_tva,
    categorie,
    total_ligne_ht
  from public.document_lines
  where document_id = v_devis.id
  order by ordre;

  perform public.insert_audit_log(
    v_user_id,
    'devis.convert_to_facture',
    'documents',
    v_facture_id,
    jsonb_build_object('source_devis_id', v_devis.id, 'source_numero', v_devis.numero)
  );

  return v_facture_id;
end;
$$;

revoke all on function public.check_email_rate_limit() from public;
revoke all on function public.check_pdf_rate_limit() from public;
revoke all on function public.log_email_send(uuid, text, text) from public;
revoke all on function public.convert_devis_to_facture(uuid) from public;

grant execute on function public.check_email_rate_limit() to authenticated;
grant execute on function public.check_pdf_rate_limit() to authenticated;
grant execute on function public.log_email_send(uuid, text, text) to authenticated;
grant execute on function public.convert_devis_to_facture(uuid) to authenticated;
