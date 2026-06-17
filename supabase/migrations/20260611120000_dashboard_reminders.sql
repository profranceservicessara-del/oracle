alter table public.profiles
add column if not exists monthly_summary_email boolean not null default false;
