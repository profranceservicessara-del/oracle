-- Profile: user avatar photo (shown in the settings profile block and the
-- bottom sidebar). Additive + idempotent. Stored in the existing "logos" bucket.
alter table public.profiles
  add column if not exists avatar_url text;
