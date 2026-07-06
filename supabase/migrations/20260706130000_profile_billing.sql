-- Billing/assinatura no profile (Stripe). Aditivo + idempotente.
alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists plan text default 'free',
  add column if not exists subscription_status text default 'inactive',
  add column if not exists current_period_end timestamptz,
  add column if not exists billing_email text;

-- Segurança: usuários NÃO podem alterar os campos de billing (evita auto-upgrade
-- de plano via update do próprio profile). Só o service_role (webhook) escreve.
-- O trigger preserva os valores antigos para qualquer update não-service_role.
create or replace function public.protect_billing_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    new.stripe_customer_id := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id;
    new.plan := old.plan;
    new.subscription_status := old.subscription_status;
    new.current_period_end := old.current_period_end;
    new.billing_email := old.billing_email;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_billing_columns on public.profiles;
create trigger trg_protect_billing_columns
  before update on public.profiles
  for each row execute function public.protect_billing_columns();
