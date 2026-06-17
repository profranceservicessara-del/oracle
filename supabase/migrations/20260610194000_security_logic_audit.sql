create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "profiles_delete_own"
on public.profiles for delete
to authenticated
using (id = auth.uid());

create policy "clients_select_own"
on public.clients for select
to authenticated
using (user_id = auth.uid());

create policy "clients_insert_own"
on public.clients for insert
to authenticated
with check (user_id = auth.uid());

create policy "clients_update_own"
on public.clients for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "clients_delete_own"
on public.clients for delete
to authenticated
using (user_id = auth.uid());

create policy "catalog_items_select_own"
on public.catalog_items for select
to authenticated
using (user_id = auth.uid());

create policy "catalog_items_insert_own"
on public.catalog_items for insert
to authenticated
with check (user_id = auth.uid());

create policy "catalog_items_update_own"
on public.catalog_items for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "catalog_items_delete_own"
on public.catalog_items for delete
to authenticated
using (user_id = auth.uid());

create policy "documents_select_own"
on public.documents for select
to authenticated
using (user_id = auth.uid());

create policy "documents_insert_own"
on public.documents for insert
to authenticated
with check (user_id = auth.uid());

create policy "documents_update_own"
on public.documents for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "documents_delete_own"
on public.documents for delete
to authenticated
using (user_id = auth.uid());

create policy "document_lines_select_own"
on public.document_lines for select
to authenticated
using (user_id = auth.uid());

create policy "document_lines_insert_own"
on public.document_lines for insert
to authenticated
with check (user_id = auth.uid());

create policy "document_lines_update_own"
on public.document_lines for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "document_lines_delete_own"
on public.document_lines for delete
to authenticated
using (user_id = auth.uid());

create policy "payments_select_own"
on public.payments for select
to authenticated
using (user_id = auth.uid());

create policy "payments_insert_own"
on public.payments for insert
to authenticated
with check (user_id = auth.uid());

create policy "payments_update_own"
on public.payments for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "payments_delete_own"
on public.payments for delete
to authenticated
using (user_id = auth.uid());

create policy "purchases_select_own"
on public.purchases for select
to authenticated
using (user_id = auth.uid());

create policy "purchases_insert_own"
on public.purchases for insert
to authenticated
with check (user_id = auth.uid());

create policy "purchases_update_own"
on public.purchases for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "purchases_delete_own"
on public.purchases for delete
to authenticated
using (user_id = auth.uid());

create policy "sequences_select_own"
on public.sequences for select
to authenticated
using (user_id = auth.uid());

create policy "sequences_insert_own_guarded"
on public.sequences for insert
to authenticated
with check (user_id = auth.uid());

create policy "sequences_update_own_guarded"
on public.sequences for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "sequences_delete_own_guarded"
on public.sequences for delete
to authenticated
using (user_id = auth.uid());

create policy "audit_log_select_own"
on public.audit_log for select
to authenticated
using (user_id = auth.uid());

create or replace function public.guard_sequence_write()
returns trigger
language plpgsql
as $$
begin
  if current_user not in ('postgres', 'supabase_admin') then
    raise exception 'Séquence documentaire: modification directe interdite';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger sequences_guard_insert_update_delete
before insert or update or delete on public.sequences
for each row
execute function public.guard_sequence_write();

create or replace function public.guard_audit_log_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Audit log: modification directe interdite';
end;
$$;

create trigger audit_log_block_update_delete
before update or delete on public.audit_log
for each row
execute function public.guard_audit_log_append_only();

create or replace function public.insert_audit_log(
  p_user_id uuid,
  p_action text,
  p_entity text,
  p_entity_id uuid,
  p_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (user_id, action, entity, entity_id, payload)
  values (p_user_id, p_action, p_entity, p_entity_id, coalesce(p_payload, '{}'::jsonb));
end;
$$;

create or replace function public.guard_document_immutability()
returns trigger
language plpgsql
as $$
declare
  v_has_avoir boolean;
begin
  if tg_op = 'DELETE' then
    if old.status <> 'draft' then
      raise exception 'Document émis: modification interdite';
    end if;

    return old;
  end if;

  if old.status = 'draft' then
    return new;
  end if;

  if row(
    new.user_id,
    new.client_id,
    new.type,
    new.numero,
    new.date_emission,
    new.date_echeance,
    new.date_prestation,
    new.validite_jours,
    new.total_ht,
    new.total_tva,
    new.total_ttc,
    new.mention_tva,
    new.conditions_paiement,
    new.notes_bas_page,
    new.source_devis_id,
    new.facture_origine_id,
    new.emitted_at
  ) is distinct from row(
    old.user_id,
    old.client_id,
    old.type,
    old.numero,
    old.date_emission,
    old.date_echeance,
    old.date_prestation,
    old.validite_jours,
    old.total_ht,
    old.total_tva,
    old.total_ttc,
    old.mention_tva,
    old.conditions_paiement,
    old.notes_bas_page,
    old.source_devis_id,
    old.facture_origine_id,
    old.emitted_at
  ) then
    raise exception 'Document émis: modification interdite';
  end if;

  if new.status is distinct from old.status then
    if old.status = 'sent' and old.type = 'devis' and new.status in ('accepted', 'refused', 'expired') then
      return new;
    end if;

    if old.status = 'sent' and old.type in ('facture', 'avoir') and new.status in ('paid', 'partial', 'cancelled') then
      if old.type = 'facture' and new.status = 'cancelled' then
        select exists (
          select 1
          from public.documents avoir
          where avoir.user_id = old.user_id
            and avoir.type = 'avoir'
            and avoir.facture_origine_id = old.id
        )
        into v_has_avoir;

        if not v_has_avoir then
          raise exception 'Annulation interdite: avoir obligatoire';
        end if;
      end if;

      return new;
    end if;

    raise exception 'Document émis: modification interdite';
  end if;

  return new;
end;
$$;

create trigger documents_guard_immutability_update_delete
before update or delete on public.documents
for each row
execute function public.guard_document_immutability();

create or replace function public.guard_document_lines_immutability()
returns trigger
language plpgsql
as $$
declare
  v_document_status text;
  v_document_id uuid;
begin
  if tg_op = 'DELETE' then
    v_document_id := old.document_id;
  else
    v_document_id := new.document_id;
  end if;

  select status
  into v_document_status
  from public.documents
  where id = v_document_id;

  if v_document_status is null then
    raise exception 'Document introuvable';
  end if;

  if v_document_status <> 'draft' then
    raise exception 'Document émis: modification interdite';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger document_lines_guard_immutability
before insert or update or delete on public.document_lines
for each row
execute function public.guard_document_lines_immutability();

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

  update public.documents
  set numero = v_numero,
      status = 'sent',
      emitted_at = now()
  where id = v_document.id
  returning * into v_document;

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

create or replace function public.audit_document_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status then
    if not (old.status = 'draft' and new.status = 'sent') then
      perform public.insert_audit_log(
        new.user_id,
        'document.status_update',
        'documents',
        new.id,
        jsonb_build_object('from', old.status, 'to', new.status)
      );
    end if;
  end if;

  return new;
end;
$$;

create trigger documents_audit_status_update
after update of status on public.documents
for each row
execute function public.audit_document_status_change();

create or replace function public.audit_payment_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.payments%rowtype;
begin
  if tg_op = 'DELETE' then
    v_row := old;
  else
    v_row := new;
  end if;

  perform public.insert_audit_log(
    v_row.user_id,
    case when tg_op = 'INSERT' then 'payment.insert' else 'payment.delete' end,
    'payments',
    v_row.id,
    to_jsonb(v_row)
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger payments_audit_insert
after insert on public.payments
for each row
execute function public.audit_payment_change();

create trigger payments_audit_delete
after delete on public.payments
for each row
execute function public.audit_payment_change();

create or replace function public.audit_profile_fiscal_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if row(
    old.regime_tva,
    old.activite_principale,
    old.acre,
    old.versement_liberatoire,
    old.taux_penalites_retard
  ) is distinct from row(
    new.regime_tva,
    new.activite_principale,
    new.acre,
    new.versement_liberatoire,
    new.taux_penalites_retard
  ) then
    perform public.insert_audit_log(
      new.id,
      'profile.fiscal_update',
      'profiles',
      new.id,
      jsonb_build_object(
        'old', jsonb_build_object(
          'regime_tva', old.regime_tva,
          'activite_principale', old.activite_principale,
          'acre', old.acre,
          'versement_liberatoire', old.versement_liberatoire,
          'taux_penalites_retard', old.taux_penalites_retard
        ),
        'new', jsonb_build_object(
          'regime_tva', new.regime_tva,
          'activite_principale', new.activite_principale,
          'acre', new.acre,
          'versement_liberatoire', new.versement_liberatoire,
          'taux_penalites_retard', new.taux_penalites_retard
        )
      )
    );
  end if;

  return new;
end;
$$;

create trigger profiles_audit_fiscal_update
after update of regime_tva, activite_principale, acre, versement_liberatoire, taux_penalites_retard
on public.profiles
for each row
execute function public.audit_profile_fiscal_change();

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
    v_facture.total_ht,
    v_facture.total_tva,
    v_facture.total_ttc,
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

revoke all on function public.guard_sequence_write() from public;
revoke all on function public.guard_audit_log_append_only() from public;
revoke all on function public.insert_audit_log(uuid, text, text, uuid, jsonb) from public;
revoke all on function public.guard_document_immutability() from public;
revoke all on function public.guard_document_lines_immutability() from public;
revoke all on function public.audit_document_status_change() from public;
revoke all on function public.audit_payment_change() from public;
revoke all on function public.audit_profile_fiscal_change() from public;
revoke all on function public.emit_document(uuid) from public;
revoke all on function public.create_avoir(uuid) from public;

grant execute on function public.emit_document(uuid) to authenticated;
grant execute on function public.create_avoir(uuid) to authenticated;
