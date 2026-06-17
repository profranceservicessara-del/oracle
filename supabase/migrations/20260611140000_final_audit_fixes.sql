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

  if current_setting('app.rgpd_legal_transfer', true) = 'true'
    and old.status <> 'draft'
    and new.user_id is distinct from old.user_id
    and row(
      new.client_id,
      new.type,
      new.status,
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
      new.pdf_path,
      new.created_at,
      new.updated_at,
      new.emitted_at
    ) is not distinct from row(
      old.client_id,
      old.type,
      old.status,
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
      old.pdf_path,
      old.created_at,
      old.updated_at,
      old.emitted_at
    ) then
    return new;
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

    if old.type in ('facture', 'avoir')
      and old.status in ('sent', 'partial', 'paid')
      and new.status in ('sent', 'partial', 'paid') then
      return new;
    end if;

    if old.type = 'facture'
      and old.status in ('sent', 'partial', 'paid')
      and new.status = 'cancelled' then
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

      return new;
    end if;

    raise exception 'Document émis: modification interdite';
  end if;

  return new;
end;
$$;

create or replace function public.guard_document_lines_immutability()
returns trigger
language plpgsql
as $$
declare
  v_document_status text;
  v_document_id uuid;
begin
  if tg_op = 'UPDATE'
    and current_setting('app.rgpd_legal_transfer', true) = 'true'
    and new.user_id is distinct from old.user_id
    and row(
      new.document_id,
      new.ordre,
      new.designation,
      new.description,
      new.quantite,
      new.prix_unitaire_ht,
      new.taux_tva,
      new.categorie,
      new.total_ligne_ht
    ) is not distinct from row(
      old.document_id,
      old.ordre,
      old.designation,
      old.description,
      old.quantite,
      old.prix_unitaire_ht,
      old.taux_tva,
      old.categorie,
      old.total_ligne_ht
    ) then
    return new;
  end if;

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

create or replace function public.rgpd_transfer_fiscal_documents(
  p_original_user_id uuid,
  p_anonymized_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.rgpd_legal_transfer', 'true', true);

  update public.document_lines line
  set user_id = p_anonymized_user_id
  from public.documents document
  where line.document_id = document.id
    and line.user_id = p_original_user_id
    and document.user_id = p_original_user_id
    and document.status <> 'draft';

  update public.documents
  set user_id = p_anonymized_user_id
  where user_id = p_original_user_id
    and status <> 'draft';

  perform set_config('app.rgpd_legal_transfer', 'false', true);
exception
  when others then
    perform set_config('app.rgpd_legal_transfer', 'false', true);
    raise;
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

  perform public.rgpd_transfer_fiscal_documents(p_original_user_id, p_anonymized_user_id);

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

  update public.sequences
  set user_id = p_anonymized_user_id
  where user_id = p_original_user_id;

  perform public.insert_audit_log(
    p_anonymized_user_id,
    'rgpd.account_anonymized',
    'profiles',
    p_anonymized_user_id,
    jsonb_build_object('original_user_id', p_original_user_id)
  );

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

revoke all on function public.rgpd_transfer_fiscal_documents(uuid, uuid) from public;
revoke all on function public.rgpd_anonymize_account(uuid, uuid) from public;

grant execute on function public.rgpd_anonymize_account(uuid, uuid) to authenticated;
