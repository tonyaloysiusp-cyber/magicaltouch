-- Keep the best 10,000 templates; permanently delete the rest (approved by the owner on 25 Nov 2026).
-- Run step by step once the database answers. Users' own designs (designs table) are never touched.
-- Templates someone bought or unlocked are always kept (on top of the 10,000).

-- 1. Which templates stay
create table if not exists public.cleanup_keep (id uuid primary key);
alter table public.cleanup_keep enable row level security;
truncate public.cleanup_keep;
with base as (
  select t.id, t.status, t.review_status, t.rights_status, t.quality_score, t.is_featured, t.published_at,
         (t.canvas_json is not null or exists (select 1 from public.template_versions v where v.template_id = t.id and v.canvas_json is not null)) as has_design,
         coalesce(t.thumbnail, t.preview) is not null as has_picture,
         row_number() over (partition by lower(trim(t.name)), t.width, t.height
                            order by t.quality_score desc nulls last, t.published_at desc nulls last, t.id) as dup_rank
  from public.templates t
), best as (
  select id from base
  where status = 'published'
    and review_status not in ('rejected', 'needs_revision', 'archived')
    and rights_status = 'verified'
    and has_design and has_picture
    and dup_rank = 1
  order by is_featured desc, quality_score desc nulls last, published_at desc nulls last
  limit 10000
)
insert into public.cleanup_keep (id)
select id from best
union select template_id from public.purchases where template_id is not null
union select template_id from public.template_unlocks where template_id is not null
on conflict do nothing;

-- 2. Pictures of the templates that go (removed from storage by the cleanup-storage function)
create table if not exists public.cleanup_files (path text primary key, bucket text not null default 'template-media', done boolean not null default false);
alter table public.cleanup_files enable row level security;
insert into public.cleanup_files (path, bucket)
select distinct regexp_replace(u, '^.*/storage/v1/object/public/([^/]+)/', ''), substring(u from '/storage/v1/object/public/([^/]+)/')
from public.templates t, unnest(array[t.thumbnail, t.preview]) as u
where t.id not in (select id from public.cleanup_keep) and u like '%/storage/v1/object/public/%'
on conflict do nothing;

-- 3. Delete in small batches (repeat until it deletes 0 rows) — gentle on the small database.
--    delete from public.templates where id in (select id from public.templates where id not in (select id from public.cleanup_keep) limit 300);

-- 4. After storage is cleaned: drop table public.cleanup_keep; drop table public.cleanup_files; vacuum (analyze) public.templates;
