-- Active Google posts with their picture resolved: a post made from a
-- design (often a private brand-promo draft) shows that design's latest
-- preview, which the public can't read directly — so this function does.
create or replace function public.public_site_posts(p_slug text default null)
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(x order by x.sort, x.published_at desc), '[]'::json) from (
    select p.id, p.slug, p.kind, p.title, p.description, p.hashtags, p.template_id, p.video_url, p.link, p.status, p.sort, p.published_at, p.updated_at,
      coalesce(t.preview, t.thumbnail, p.image_url) as image_url, t.width, t.height
    from site_posts p left join templates t on t.id = p.template_id
    where p.status = 'active' and (p_slug is null or p.slug = p_slug)
  ) x;
$$;
grant execute on function public.public_site_posts(text) to anon, authenticated;
