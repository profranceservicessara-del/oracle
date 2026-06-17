create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  prenom text,
  adresse_rue text,
  adresse_cp text,
  adresse_ville text,
  siret text check (siret is null or siret ~ '^[0-9]{14}$'),
  code_ape text,
  regime_tva text not null default 'franchise' check (regime_tva in ('franchise', 'assujetti')),
  activite_principale text check (activite_principale in ('vente', 'service_bic', 'service_bnc')),
  acre boolean not null default false,
  versement_liberatoire boolean not null default false,
  taux_penalites_retard numeric(6,2) not null default 10.0 check (taux_penalites_retard >= 0), -- Miroir DB de fiscalConfig.legalDocumentValues.defaultLatePenaltyRate; mettre à jour ensemble.
  logo_url text,
  couleur_principale text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('particulier', 'professionnel')),
  nom text,
  raison_sociale text,
  siren text check (siren is null or siren ~ '^[0-9]{9}$'),
  adresse_rue text,
  adresse_cp text,
  adresse_ville text,
  email text check (email is null or email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  telephone text,
  notes text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  check (nom is not null or raison_sociale is not null),
  check (type <> 'professionnel' or (raison_sociale is not null and siren is not null))
);

alter table public.clients enable row level security;

create index clients_user_id_idx on public.clients(user_id);

create trigger clients_set_updated_at
before update on public.clients
for each row
execute function public.set_updated_at();

create table public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  designation text not null,
  description text,
  prix_unitaire_ht numeric(12,2) not null check (prix_unitaire_ht >= 0),
  unite text not null default 'unité',
  categorie text not null check (categorie in ('vente', 'service_bic', 'service_bnc')),
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.catalog_items enable row level security;

create index catalog_items_user_id_idx on public.catalog_items(user_id);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id),
  type text not null check (type in ('devis', 'facture', 'avoir')),
  status text not null default 'draft' check (
    status in ('draft', 'sent', 'paid', 'partial', 'cancelled', 'expired', 'accepted', 'refused')
  ),
  numero text,
  date_emission date,
  date_echeance date,
  date_prestation date,
  validite_jours integer check (validite_jours is null or validite_jours >= 0),
  total_ht numeric(12,2) not null default 0 check (total_ht >= 0),
  total_tva numeric(12,2) not null default 0 check (total_tva >= 0),
  total_ttc numeric(12,2) not null default 0 check (total_ttc >= 0),
  mention_tva text,
  conditions_paiement text,
  notes_bas_page text,
  source_devis_id uuid references public.documents(id),
  facture_origine_id uuid references public.documents(id),
  pdf_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  emitted_at timestamptz,
  unique (user_id, numero),
  unique (id, user_id),
  foreign key (client_id, user_id) references public.clients(id, user_id),
  foreign key (source_devis_id, user_id) references public.documents(id, user_id),
  foreign key (facture_origine_id, user_id) references public.documents(id, user_id),
  check (numero is null or status <> 'draft'),
  check (type = 'devis' or validite_jours is null),
  check (type = 'avoir' or facture_origine_id is null)
);

alter table public.documents enable row level security;

create index documents_user_id_idx on public.documents(user_id);
create index documents_client_id_idx on public.documents(client_id);
create index documents_facture_origine_id_idx on public.documents(facture_origine_id);

create trigger documents_set_updated_at
before update on public.documents
for each row
execute function public.set_updated_at();

create table public.document_lines (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  ordre integer not null,
  designation text not null,
  description text,
  quantite numeric(12,3) not null check (quantite > 0),
  prix_unitaire_ht numeric(12,2) not null check (prix_unitaire_ht >= 0),
  taux_tva numeric(5,2) not null default 0 check (taux_tva >= 0),
  categorie text not null check (categorie in ('vente', 'service_bic', 'service_bnc')),
  total_ligne_ht numeric(12,2) not null,
  foreign key (document_id, user_id) references public.documents(id, user_id) on delete cascade
);

alter table public.document_lines enable row level security;

create index document_lines_document_id_idx on public.document_lines(document_id);
create index document_lines_user_id_idx on public.document_lines(user_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.documents(id),
  date_encaissement date not null,
  montant numeric(12,2) not null check (montant > 0),
  moyen text not null check (moyen in ('virement', 'cheque', 'especes', 'cb', 'stripe', 'autre')),
  reference text,
  notes text,
  created_at timestamptz not null default now(),
  foreign key (document_id, user_id) references public.documents(id, user_id)
);

alter table public.payments enable row level security;

create index payments_user_id_idx on public.payments(user_id);
create index payments_document_id_idx on public.payments(document_id);
create index payments_date_encaissement_idx on public.payments(date_encaissement);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date_achat date not null,
  fournisseur text not null,
  designation text not null,
  montant numeric(12,2) not null check (montant >= 0),
  moyen text,
  reference_piece text,
  created_at timestamptz not null default now()
);

alter table public.purchases enable row level security;

create index purchases_user_id_idx on public.purchases(user_id);
create index purchases_date_achat_idx on public.purchases(date_achat);

create table public.sequences (
  user_id uuid not null references auth.users(id) on delete cascade,
  doc_type text not null check (doc_type in ('devis', 'facture', 'avoir')),
  annee integer not null check (annee >= 2000),
  dernier_numero integer not null default 0 check (dernier_numero >= 0),
  primary key (user_id, doc_type, annee)
);

alter table public.sequences enable row level security;

create table public.audit_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  entity text not null,
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;

create index audit_log_user_id_idx on public.audit_log(user_id);
create index audit_log_entity_idx on public.audit_log(entity, entity_id);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, nome, prenom)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'nome', ''),
    nullif(new.raw_user_meta_data ->> 'prenom', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row
execute function public.handle_new_user_profile();
