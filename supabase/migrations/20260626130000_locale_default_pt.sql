-- Flip the app's default language to Portuguese (French becomes opt-in).
-- New user_preferences rows default to 'pt'. Existing rows still on the old 'fr'
-- default are moved to 'pt' — pre-launch, nobody has deliberately chosen French
-- yet, so this makes the system "open in Portuguese" as requested. Idempotent.

alter table public.user_preferences alter column locale set default 'pt';

update public.user_preferences set locale = 'pt' where locale = 'fr';
