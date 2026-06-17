create or replace function public.guard_document_insert_and_numbering()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'draft' then
      raise exception 'Document draft obrigatório: emissão somente via emit_document';
    end if;

    if new.numero is not null then
      raise exception 'Numéro interdit: numérotation somente via emit_document';
    end if;

    return new;
  end if;

  if old.status = 'draft'
    and new.numero is not null
    and coalesce(current_setting('app.emit_document', true), '') <> 'true' then
    raise exception 'Numéro interdit: numérotation somente via emit_document';
  end if;

  return new;
end;
$$;

create trigger documents_before_insert_update_guard_numbering
before insert or update on public.documents
for each row
execute function public.guard_document_insert_and_numbering();

create or replace function public.emit_document(doc_id uuid)
returns public.documents
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_user uuid := auth.uid();
  v_document public.documents%rowtype;
  v_profile public.profiles%rowtype;
  v_year integer;
  v_next_number integer;
  v_prefix text;
  v_numero text;
begin
  if v_auth_user is null then
    raise exception 'Authentification requise';
  end if;

  select *
  into v_document
  from public.documents
  where id = doc_id
    and user_id = v_auth_user
  for update;

  if not found then
    raise exception 'Document introuvable';
  end if;

  if v_document.status <> 'draft' then
    raise exception 'Seuls les documents en brouillon peuvent être émis';
  end if;

  if v_document.date_emission is null then
    raise exception 'Date d''émission obligatoire';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = v_document.user_id;

  if v_profile.id is null then
    raise exception 'Profil utilisateur introuvable';
  end if;

  if nullif(trim(v_profile.nome), '') is null then
    raise exception 'Profil incomplet: nom obligatoire';
  end if;

  if nullif(trim(v_profile.siret), '') is null then
    raise exception 'Profil incomplet: SIRET obligatoire';
  end if;

  if nullif(trim(v_profile.adresse_rue), '') is null
    or nullif(trim(v_profile.adresse_cp), '') is null
    or nullif(trim(v_profile.adresse_ville), '') is null then
    raise exception 'Profil incomplet: adresse obligatoire';
  end if;

  v_year := extract(year from v_document.date_emission)::integer;
  v_prefix := case v_document.type
    when 'facture' then 'FAC'
    when 'devis' then 'DEV'
    when 'avoir' then 'AVR'
  end;

  perform pg_advisory_xact_lock(
    hashtextextended(v_document.user_id::text || ':' || v_document.type || ':' || v_year::text, 0)
  );

  insert into public.sequences (user_id, doc_type, annee, dernier_numero)
  values (v_document.user_id, v_document.type, v_year, 1)
  on conflict (user_id, doc_type, annee)
  do update set dernier_numero = public.sequences.dernier_numero + 1
  returning dernier_numero into v_next_number;

  v_numero := v_prefix || '-' || v_year::text || '-' || lpad(v_next_number::text, 4, '0');

  perform set_config('app.emit_document', 'true', true);

  update public.documents
  set numero = v_numero,
      status = 'sent',
      emitted_at = now()
  where id = v_document.id
  returning * into v_document;

  perform set_config('app.emit_document', 'false', true);

  perform public.insert_audit_log(
    v_document.user_id,
    'document.emit',
    'documents',
    v_document.id,
    jsonb_build_object('numero', v_numero, 'type', v_document.type, 'annee', v_year)
  );

  return v_document;
end;
$$;

alter table public.documents
drop constraint if exists documents_total_ht_check,
drop constraint if exists documents_total_tva_check,
drop constraint if exists documents_total_ttc_check;

alter table public.documents
add constraint documents_total_ht_by_type_check
  check ((type = 'avoir' and total_ht <= 0) or (type <> 'avoir' and total_ht >= 0)),
add constraint documents_total_tva_by_type_check
  check ((type = 'avoir' and total_tva <= 0) or (type <> 'avoir' and total_tva >= 0)),
add constraint documents_total_ttc_by_type_check
  check ((type = 'avoir' and total_ttc <= 0) or (type <> 'avoir' and total_ttc >= 0));

create or replace function public.create_avoir(facture_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_user uuid := auth.uid();
  v_facture public.documents%rowtype;
  v_avoir_id uuid;
begin
  if v_auth_user is null then
    raise exception 'Authentification requise';
  end if;

  select *
  into v_facture
  from public.documents
  where id = facture_id
    and user_id = v_auth_user
    and type = 'facture';

  if not found then
    raise exception 'Facture introuvable';
  end if;

  if v_facture.status = 'draft' or v_facture.numero is null then
    raise exception 'Avoir interdit: facture non émise';
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
    facture_origine_id
  )
  values (
    v_facture.user_id,
    v_facture.client_id,
    'avoir',
    'draft',
    current_date,
    current_date,
    v_facture.date_prestation,
    -v_facture.total_ht,
    -v_facture.total_tva,
    -v_facture.total_ttc,
    v_facture.mention_tva,
    v_facture.conditions_paiement,
    v_facture.notes_bas_page,
    v_facture.id
  )
  returning id into v_avoir_id;

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
    v_avoir_id,
    user_id,
    ordre,
    designation,
    description,
    quantite,
    prix_unitaire_ht,
    taux_tva,
    categorie,
    -abs(total_ligne_ht)
  from public.document_lines
  where document_id = v_facture.id
  order by ordre;

  perform public.insert_audit_log(
    v_facture.user_id,
    'avoir.create',
    'documents',
    v_avoir_id,
    jsonb_build_object('facture_origine_id', v_facture.id, 'facture_numero', v_facture.numero)
  );

  return v_avoir_id;
end;
$$;

revoke all on function public.guard_document_insert_and_numbering() from public;
revoke all on function public.emit_document(uuid) from public;
revoke all on function public.create_avoir(uuid) from public;

grant execute on function public.emit_document(uuid) to authenticated;
grant execute on function public.create_avoir(uuid) to authenticated;
