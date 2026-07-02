-- Profile: start-of-activity date (editable in the profile form). Additive + idempotent.
alter table public.profiles
  add column if not exists date_debut_activite date;
