-- CRM Phase 9: private Storage bucket for client document attachments.
-- Files live under  {company_id}/{client_id}/{uuid-filename}  and access is
-- scoped to company members via the existing crm_is_company_member() helper.
-- Additive + idempotent.

insert into storage.buckets (id, name, public, file_size_limit)
values ('crm-documents', 'crm-documents', false, 10485760)
on conflict (id) do update set public = false, file_size_limit = 10485760;

drop policy if exists "crm_documents_storage_select" on storage.objects;
drop policy if exists "crm_documents_storage_insert" on storage.objects;
drop policy if exists "crm_documents_storage_update" on storage.objects;
drop policy if exists "crm_documents_storage_delete" on storage.objects;

create policy "crm_documents_storage_select" on storage.objects for select to authenticated
using (
  bucket_id = 'crm-documents'
  and public.crm_is_company_member((storage.foldername(name))[1]::uuid)
);

create policy "crm_documents_storage_insert" on storage.objects for insert to authenticated
with check (
  bucket_id = 'crm-documents'
  and public.crm_is_company_member((storage.foldername(name))[1]::uuid)
);

create policy "crm_documents_storage_update" on storage.objects for update to authenticated
using (
  bucket_id = 'crm-documents'
  and public.crm_is_company_member((storage.foldername(name))[1]::uuid)
)
with check (
  bucket_id = 'crm-documents'
  and public.crm_is_company_member((storage.foldername(name))[1]::uuid)
);

create policy "crm_documents_storage_delete" on storage.objects for delete to authenticated
using (
  bucket_id = 'crm-documents'
  and public.crm_is_company_member((storage.foldername(name))[1]::uuid)
);
