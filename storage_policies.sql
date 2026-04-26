-- =====================================================================
-- immodays · Storage policies for "property-images" bucket
-- =====================================================================
-- Run this AFTER creating the bucket in the Dashboard:
--   Storage → New bucket → Name: property-images → Public: on
--
-- Then open SQL Editor and run this file.
-- =====================================================================

-- Public read access to all files in the bucket
drop policy if exists "Public read for property-images" on storage.objects;
create policy "Public read for property-images"
  on storage.objects for select
  using (bucket_id = 'property-images');

-- Authenticated users may upload into a folder named with their own user id:
-- e.g. {user_id}/{property_id}/{filename}.jpg
drop policy if exists "Users can upload to own folder" on storage.objects;
create policy "Users can upload to own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'property-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update own files" on storage.objects;
create policy "Users can update own files"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'property-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'property-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own files" on storage.objects;
create policy "Users can delete own files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'property-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
