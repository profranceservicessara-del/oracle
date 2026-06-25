-- CRM Phase 6: bridge CRM clients to invoicing clients.
-- Additive + idempotent. Links a crm_clients row to its invoicing clients row,
-- so we can create factures/devis from a CRM client and surface billing on the
-- CRM client detail. on delete set null: deleting the invoicing client just
-- unlinks the CRM client (keeps the CRM record intact).

alter table public.crm_clients
  add column if not exists client_id uuid references public.clients(id) on delete set null;

create index if not exists crm_clients_client_id_idx on public.crm_clients (client_id);
