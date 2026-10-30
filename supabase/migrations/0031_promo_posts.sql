-- Festival scheduler and social integration: promo_items can also hold
-- scheduled posts (kind = 'post', meta = { occasion_id, channel, format,
-- caption, post_on }) and social profiles (kind = 'social', url = profile).
-- Additive: existing rows and code are unaffected.
alter table public.promo_items drop constraint if exists promo_items_kind_check;
alter table public.promo_items add constraint promo_items_kind_check check (kind in ('channel', 'campaign', 'keyword', 'post', 'social'));
create index if not exists promo_items_kind_idx on public.promo_items (kind);
