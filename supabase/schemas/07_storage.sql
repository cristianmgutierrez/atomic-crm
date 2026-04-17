--
-- Storage policies — multi-tenant isolation for the `attachments` bucket.
--
-- Path scheme:
--   escritorios/{escritorio_id}/...   → tenant-scoped (task attachments, company logos, sale avatars)
--   configs/...                       → global (configuration logos — single-row table, app-wide)
--
-- Reads/writes/deletes on `escritorios/{id}/...` require the user's escritorio to match {id},
-- unless the user is admin (admins span all tenants).
-- Reads/writes on `configs/...` only require an authenticated session.
--

create policy "attachments_tenant_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'attachments'
    and (
      public.is_admin()
      or (
        (storage.foldername(name))[1] = 'escritorios'
        and (storage.foldername(name))[2]::bigint = public.get_my_escritorio_id()
      )
      or (storage.foldername(name))[1] = 'configs'
    )
  );

create policy "attachments_tenant_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and (
      public.is_admin()
      or (
        (storage.foldername(name))[1] = 'escritorios'
        and (storage.foldername(name))[2]::bigint = public.get_my_escritorio_id()
      )
      or (storage.foldername(name))[1] = 'configs'
    )
  );

create policy "attachments_tenant_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'attachments'
    and (
      public.is_admin()
      or (
        (storage.foldername(name))[1] = 'escritorios'
        and (storage.foldername(name))[2]::bigint = public.get_my_escritorio_id()
      )
      or (storage.foldername(name))[1] = 'configs'
    )
  );

create policy "attachments_tenant_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'attachments'
    and (
      public.is_admin()
      or (
        (storage.foldername(name))[1] = 'escritorios'
        and (storage.foldername(name))[2]::bigint = public.get_my_escritorio_id()
      )
      or (storage.foldername(name))[1] = 'configs'
    )
  );
