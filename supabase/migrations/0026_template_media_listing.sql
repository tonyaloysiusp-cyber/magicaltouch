-- Internal template previews stay private: the template-media bucket is
-- public so published thumbnails load by URL, but LISTING its files (which
-- would reveal draft and internal-design previews) is now limited to
-- admins and to files of published templates.
alter policy "Template media is publicly readable" on storage.objects
  using (
    bucket_id = 'template-media'
    and (
      public.is_admin()
      or exists (
        select 1 from public.templates t
        where t.status = 'published' and t.id::text = (storage.foldername(name))[2]
      )
    )
  );
