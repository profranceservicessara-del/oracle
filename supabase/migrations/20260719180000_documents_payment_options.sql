-- Condições de pagamento — opções extras na fatura/orçamento:
-- meios de pagamento aceitos e pedido de depósito (acompte). Aditivo e
-- idempotente. Informativo (não altera os totais do documento).

alter table public.documents add column if not exists moyens_paiement text[];
alter table public.documents add column if not exists acompte_pct numeric;
