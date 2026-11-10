-- Template quality review (Phase 2): a 100-point score per template, its
-- breakdown, and a review status, so only reviewed templates are published.
alter table public.templates add column if not exists quality_score smallint check (quality_score between 0 and 100);
alter table public.templates add column if not exists quality_breakdown jsonb;
alter table public.templates add column if not exists review_status text not null default 'unreviewed'
  check (review_status in ('unreviewed', 'approved', 'needs_revision', 'rejected', 'archived'));
alter table public.templates add column if not exists review_notes text;
alter table public.templates add column if not exists reviewed_at timestamptz;
create index if not exists templates_review_status_idx on public.templates (review_status);
create index if not exists templates_quality_score_idx on public.templates (quality_score desc nulls last);
-- Hashtag search pages filter on this array.
create index if not exists templates_hashtags_gin on public.templates using gin (hashtags);
