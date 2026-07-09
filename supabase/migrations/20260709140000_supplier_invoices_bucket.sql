-- Factures reçues (Fase 3): bucket privado p/ anexos das faturas de fornecedor.
-- Arquivos ficam em  {user_id}/{uuid-filename}  e o acesso é escopado ao dono
-- (primeira pasta = auth.uid()). Aditivo + idempotente. Espelha o padrão de
-- 20260625170000_crm_documents_bucket.sql.

insert into storage.buckets (id, name, public, file_size_limit)
values ('supplier-invoices', 'supplier-invoices', false, 10485760)
on conflict (id) do update set public = false, file_size_limit = 10485760;

drop policy if exists "supplier_invoices_storage_select" on storage.objects;
drop policy if exists "supplier_invoices_storage_insert" on storage.objects;
drop policy if exists "supplier_invoices_storage_update" on storage.objects;
drop policy if exists "supplier_invoices_storage_delete" on storage.objects;

create policy "supplier_invoices_storage_select" on storage.objects for select to authenticated
using (
  bucket_id = 'supplier-invoices'
  and (storage.foldername(name))[1]::uuid = auth.uid()
);

create policy "supplier_invoices_storage_insert" on storage.objects for insert to authenticated
with check (
  bucket_id = 'supplier-invoices'
  and (storage.foldername(name))[1]::uuid = auth.uid()
);

create policy "supplier_invoices_storage_update" on storage.objects for update to authenticated
using (
  bucket_id = 'supplier-invoices'
  and (storage.foldername(name))[1]::uuid = auth.uid()
)
with check (
  bucket_id = 'supplier-invoices'
  and (storage.foldername(name))[1]::uuid = auth.uid()
);

create policy "supplier_invoices_storage_delete" on storage.objects for delete to authenticated
using (
  bucket_id = 'supplier-invoices'
  and (storage.foldername(name))[1]::uuid = auth.uid()
);
