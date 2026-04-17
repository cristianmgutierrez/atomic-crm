-- Multi-tenant isolation for the `attachments` storage bucket.
--
-- Before this migration: bucket public, paths flat (`{random}.ext`), policies only checked
-- bucket_id. Anyone with a URL could read any object.
--
-- After this migration:
--   * Bucket private (no anonymous access — requires signed URLs).
--   * New path scheme: `escritorios/{escritorio_id}/...` for tenant data, `configs/...` for global.
--   * Policies enforce that users only touch their own escritorio's prefix (admins bypass).
--
-- Existing seed objects (avatars from sales seed) get moved into the new prefix per their owner.

-- 1. Make the bucket private.
update storage.buckets set public = false where id = 'attachments';

-- 2. Drop the old permissive policies.
drop policy if exists "Attachments 1mt4rzk_0" on storage.objects;
drop policy if exists "Attachments 1mt4rzk_1" on storage.objects;
drop policy if exists "Attachments 1mt4rzk_3" on storage.objects;

-- 3. Create new tenant-aware policies. Identical predicate across SELECT/INSERT/UPDATE/DELETE:
--    - admin bypass via public.is_admin()
--    - escritorios/{id}/... → {id} must equal the caller's escritorio_id
--    - configs/...          → any authenticated user (single-row global config)
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

-- 4. Migrate existing root-level objects into the owner's escritorio prefix.
-- All existing objects pre-date the prefix scheme; they were uploaded by sales (avatars from
-- seed). Look up each object's owner → sales.escritorio_id and move it under that prefix.
-- Objects whose owner has no escritorio (shouldn't happen in seed) are deleted as orphans.
do $$
declare
  obj record;
  target_escritorio bigint;
  new_path text;
begin
  for obj in
    select id, name, owner
    from storage.objects
    where bucket_id = 'attachments'
      and name not like 'escritorios/%'
      and name not like 'configs/%'
  loop
    select escritorio_id into target_escritorio
    from public.sales
    where user_id = obj.owner;

    if target_escritorio is null then
      raise notice 'Deleting orphan storage object % (owner % has no escritorio)', obj.name, obj.owner;
      delete from storage.objects where id = obj.id;
      continue;
    end if;

    new_path := 'escritorios/' || target_escritorio || '/legacy/' || obj.name;
    update storage.objects set name = new_path where id = obj.id;

    -- Update sales.avatar JSON to reflect the new path (src will be re-signed by frontend).
    update public.sales
    set avatar = jsonb_set(
      avatar::jsonb,
      '{path}',
      to_jsonb(new_path)
    )
    where avatar is not null
      and avatar->>'path' = obj.name;
  end loop;
end $$;
