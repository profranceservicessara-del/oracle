alter table public.profiles
add column if not exists declaration_periodicite text not null default 'trimestral'
check (declaration_periodicite in ('mensal', 'trimestral'));

create or replace function public.guard_payment_total()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_document public.documents%rowtype;
  v_existing_total numeric(12,2);
  v_next_total numeric(12,2);
begin
  select *
  into v_document
  from public.documents
  where id = new.document_id
    and user_id = new.user_id
  for update;

  if not found then
    raise exception 'Facture introuvable';
  end if;

  if v_document.type <> 'facture' then
    raise exception 'Paiement autorisé uniquement pour une facture';
  end if;

  if v_document.status not in ('sent', 'partial', 'paid') then
    raise exception 'Paiement autorisé uniquement pour une facture émise';
  end if;

  select coalesce(sum(montant), 0)
  into v_existing_total
  from public.payments
  where document_id = new.document_id
    and id is distinct from new.id;

  v_next_total := v_existing_total + new.montant;

  if v_next_total > v_document.total_ttc then
    raise exception 'Le total des paiements ne peut pas dépasser le total TTC de la facture';
  end if;

  return new;
end;
$$;

drop trigger if exists payments_guard_total on public.payments;
create trigger payments_guard_total
before insert or update on public.payments
for each row
execute function public.guard_payment_total();

create or replace function public.sync_document_payment_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_document_id uuid;
  v_document public.documents%rowtype;
  v_paid_total numeric(12,2);
  v_next_status text;
begin
  if tg_op = 'DELETE' then
    v_document_id := old.document_id;
  else
    v_document_id := new.document_id;
  end if;

  select *
  into v_document
  from public.documents
  where id = v_document_id
  for update;

  if not found or v_document.type <> 'facture' or v_document.status = 'cancelled' then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  select coalesce(sum(montant), 0)
  into v_paid_total
  from public.payments
  where document_id = v_document_id;

  if v_paid_total <= 0 then
    v_next_status := 'sent';
  elsif v_paid_total >= v_document.total_ttc then
    v_next_status := 'paid';
  else
    v_next_status := 'partial';
  end if;

  if v_document.status is distinct from v_next_status then
    update public.documents
    set status = v_next_status
    where id = v_document_id;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists payments_sync_document_status_insert on public.payments;
drop trigger if exists payments_sync_document_status_update on public.payments;
drop trigger if exists payments_sync_document_status_delete on public.payments;

create trigger payments_sync_document_status_insert
after insert on public.payments
for each row
execute function public.sync_document_payment_status();

create trigger payments_sync_document_status_update
after update of montant, document_id on public.payments
for each row
execute function public.sync_document_payment_status();

create trigger payments_sync_document_status_delete
after delete on public.payments
for each row
execute function public.sync_document_payment_status();

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

revoke all on function public.guard_payment_total() from public;
revoke all on function public.sync_document_payment_status() from public;
