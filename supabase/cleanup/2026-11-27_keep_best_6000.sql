-- Keep the best 6,000 templates; permanently delete the rest (owner approved, 27 Nov 2026).
-- Also deletes the 279 "brand-promo" posts (Admin → Social media → Our brand designs).
-- Users' own designs (designs table), profiles and purchases are never touched;
-- templates someone bought or unlocked are always kept.
-- Best = every hand-designed series template (not the mass-made "u-" ones), then the
-- most viewed / featured "u-" templates spread evenly across categories; exact duplicates go.

-- 1. Which templates stay
create table if not exists public.cleanup_keep (id uuid primary key);
alter table public.cleanup_keep enable row level security;
delete from public.cleanup_keep;
with v as (select substring(path from '^/templates/([^/?]+)$') slug, sum(views) views from public.site_views_daily where path like '/templates/%' group by 1),
base as (
  select t.id, t.is_featured, coalesce(v.views, 0) views, coalesce(t.category_id::text, t.category, '') cat, (t.slug like 'u-%') is_mass,
         row_number() over (partition by lower(trim(t.name)), t.width, t.height order by t.is_featured desc, coalesce(v.views, 0) desc, t.published_at desc nulls last, t.id) dup
  from public.templates t left join v on v.slug = t.slug
  where t.status = 'published' and t.canvas_json is not null and coalesce(t.thumbnail, t.preview) is not null
    and not ('brand-promo' = any(coalesce(t.tags, '{}')))
),
hand as (select id from base where not is_mass and dup = 1),
mass as (select id, is_featured, views, row_number() over (partition by cat order by is_featured desc, views desc, id) rn from base where is_mass and dup = 1)
insert into public.cleanup_keep (id)
select id from hand
union all
(select id from mass order by rn, is_featured desc, views desc limit greatest(0, 6000 - (select count(*) from hand)))
on conflict do nothing;
insert into public.cleanup_keep (id)
select template_id from public.purchases where template_id is not null
union select template_id from public.template_unlocks where template_id is not null
on conflict do nothing;

-- 2. Delete in batches (repeat until 0 rows)
--    delete from public.templates where id in (select id from public.templates where id not in (select id from public.cleanup_keep) limit 500);

-- 3. Unused storage pictures: Admin → Storage → "Unused template pictures" (or the cleanup-storage function).
-- 4. drop table public.cleanup_keep; drop table if exists public.template_copy_backup; vacuum (analyze) public.templates;
