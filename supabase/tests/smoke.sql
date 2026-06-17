begin;

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'smoke@example.com',
  '$2a$10$smoketestsmoketestsmoketestsmoketestsmoketestsmoke',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"nome":"Smoke"}'::jsonb,
  now(),
  now()
);

select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

update public.profiles
set nome = 'Smoke',
    prenom = 'Test',
    adresse_rue = '1 rue de Test',
    adresse_cp = '75001',
    adresse_ville = 'Paris',
    siret = '12345678901234',
    code_ape = '6201Z',
    activite_principale = 'service_bic'
where id = '11111111-1111-1111-1111-111111111111';

insert into public.clients (
  id,
  user_id,
  type,
  nom,
  adresse_rue,
  adresse_cp,
  adresse_ville,
  email
)
values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'particulier',
  'Client Smoke',
  '2 rue Client',
  '75002',
  'Paris',
  'client@example.com'
);

insert into public.documents (
  id,
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
  mention_tva
)
values (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'facture',
  'draft',
  '2026-01-15',
  '2026-02-15',
  '2026-01-15',
  100,
  0,
  100,
  'TVA non applicable, art. 293 B du CGI'
);

update public.documents
set total_ht = 120,
    total_ttc = 120
where id = '33333333-3333-3333-3333-333333333333';

insert into public.document_lines (
  id,
  document_id,
  user_id,
  ordre,
  designation,
  quantite,
  prix_unitaire_ht,
  taux_tva,
  categorie,
  total_ligne_ht
)
values (
  '44444444-4444-4444-4444-444444444444',
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  1,
  'Prestation smoke',
  1,
  120,
  0,
  'service_bic',
  120
);

select 'draft insert/update works' as test_name,
       status,
       total_ht
from public.documents
where id = '33333333-3333-3333-3333-333333333333';

select 'first emission assigns FAC-2026-0001' as test_name,
       numero
from public.emit_document('33333333-3333-3333-3333-333333333333');

insert into public.documents (
  id,
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
  mention_tva
)
values (
  '55555555-5555-5555-5555-555555555555',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'facture',
  'draft',
  '2026-03-01',
  '2026-04-01',
  '2026-03-01',
  50,
  0,
  50,
  'TVA non applicable, art. 293 B du CGI'
);

select 'second emission assigns FAC-2026-0002' as test_name,
       numero
from public.emit_document('55555555-5555-5555-5555-555555555555');

do $$
begin
  update public.documents
  set total_ht = 999
  where id = '33333333-3333-3333-3333-333333333333';

  raise exception 'FAILED: update of emitted facture unexpectedly succeeded';
exception
  when others then
    raise notice 'expected failure for emitted facture total update: %', sqlerrm;
end;
$$;

do $$
begin
  delete from public.documents
  where id = '33333333-3333-3333-3333-333333333333';

  raise exception 'FAILED: delete of emitted facture unexpectedly succeeded';
exception
  when others then
    raise notice 'expected failure for emitted facture delete: %', sqlerrm;
end;
$$;

do $$
begin
  insert into public.audit_log (user_id, action, entity, entity_id, payload)
  values (
    '11111111-1111-1111-1111-111111111111',
    'direct.insert',
    'audit_log',
    '33333333-3333-3333-3333-333333333333',
    '{}'::jsonb
  );

  raise exception 'FAILED: direct audit_log insert unexpectedly succeeded';
exception
  when others then
    raise notice 'expected failure for direct audit_log insert: %', sqlerrm;
end;
$$;

rollback;
