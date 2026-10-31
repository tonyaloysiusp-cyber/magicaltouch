-- Posts on Google (Admin → SEO → Google posts).
-- Each post is a public page at /showcase/<slug> with one big picture or
-- video, a title, description and hashtags/keywords — made so Google
-- Images, Google Videos and search show it (with structured data, sitemap
-- and IndexNow). Pictures can come from an editable design (template_id:
-- the post always shows the design's latest picture) or any image address.
-- Status: draft (only admins see it) or active (live and sent to Google).

create table if not exists public.site_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  kind text not null default 'image' check (kind in ('image', 'video')),
  title text not null,
  description text not null default '',
  hashtags text[] not null default '{}',
  template_id uuid references public.templates(id) on delete set null,
  image_url text,
  video_url text,
  link text,
  status text not null default 'draft' check (status in ('draft', 'active')),
  sort integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.site_posts enable row level security;
create policy "active posts are public" on public.site_posts for select using (status = 'active' or public.is_admin());
create policy "admins manage posts" on public.site_posts for all using (public.is_admin()) with check (public.is_admin());

-- Starter posts: the 10 brand promo designs and the 2 promo videos, live.
insert into public.site_posts (slug, kind, title, description, hashtags, template_id, status, sort, published_at, link)
select replace(t.slug, 'mtd-promo-', 'magical-touch-'), 'image',
  case t.slug
    when 'mtd-promo-instagram-launch-post' then 'Design anything. Free forever — Magical Touch Design'
    when 'mtd-promo-template-grid-post' then '5,450+ free design templates — Magical Touch Design'
    when 'mtd-promo-instagram-story' then 'Design anything. Make it magical — free online design tool'
    when 'mtd-promo-facebook-post' then 'Free online design tool with 5,450+ templates'
    when 'mtd-promo-linkedin-post' then 'Design without a design budget — free templates for small business'
    when 'mtd-promo-founder-quote-post' then 'Every feature free — Tony Aloysius, founder of Magical Touch Design'
    when 'mtd-promo-pinterest-pin' then '5,450+ free templates: invitations, posters, resumes, menus'
    when 'mtd-promo-birthday-spotlight' then 'Free birthday templates — invitations, wishes and party posts'
    when 'mtd-promo-business-spotlight' then 'Free business templates — resumes, business cards, flyers and slides'
    else '5,450+ free templates — no watermark' end,
  'Magical Touch Design is a free online graphic design tool: thousands of editable templates for posters, flyers, invitations, social media posts, resumes, menus and more. Edit online and download PDF, PNG or JPG — no watermark.',
  array['magicaltouchdesign', 'magicaltouch', 'magicaltemplatedesign', 'graphicdesign', 'onlinedesigntool', 'freetemplates', 'templatedesign', 'designtemplates'],
  t.id, 'active', t.sort_order, now(), '/templates'
from public.templates t where 'brand-promo' = any(t.tags)
on conflict (slug) do nothing;

insert into public.site_posts (slug, kind, title, description, hashtags, image_url, video_url, status, sort, published_at, link) values
  ('magical-touch-promo-reel', 'video', 'Design anything, free — Magical Touch Design promo reel', 'A 15-second look at Magical Touch Design: free templates, AI Template Studio, Photo Studio and print-ready PDF. No watermark.',
   array['magicaltouchdesign', 'magicaltouch', 'graphicdesign', 'onlinedesigntool', 'freetemplates', 'designreel'], '/home/promo/reel-cover.webp', '/promo/promo-reel-9x16.mp4', 'active', 20, now(), '/'),
  ('magical-touch-promo-square-video', 'video', 'Every feature free — Magical Touch Design video', 'Free templates, brand kits, photo editing and print-ready PDF in one online design tool.',
   array['magicaltouchdesign', 'magicaltouch', 'magicaltemplatedesign', 'graphicdesign', 'onlinedesigntool'], '/promo/promo-square.jpg', '/promo/promo-square-1x1.mp4', 'active', 21, now(), '/')
on conflict (slug) do nothing;
