-- ---------------------------------------------------------------------
-- 0015_admin_marketing_list.sql
-- Marketing list for the Email Center's Google Sheets sync (email spec
-- §27): consent and unsubscribe dates are on profiles, which only their
-- owner can read, so admins get them through this checked function.
-- Never returns passwords, tokens or unsubscribe tokens.
-- ---------------------------------------------------------------------
create or replace function public.admin_marketing_list()
returns table (user_id uuid, name text, email text, marketing_status text,
               marketing_consent_at timestamptz, unsubscribed_at timestamptz,
               last_campaign text, last_email_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can read the marketing list';
  end if;
  return query
    select p.id, p.name, u.email::text, p.marketing_status, p.marketing_consent_at, p.unsubscribed_at,
           (select c.name from public.email_log l join public.email_campaigns c on c.id = l.campaign_id
             where l.user_id = p.id order by l.created_at desc limit 1),
           (select max(l.sent_at) from public.email_log l where l.user_id = p.id)
      from public.profiles p
      join auth.users u on u.id = p.id
     where p.marketing_status <> 'none'
     order by p.marketing_consent_at desc nulls last;
end;
$$;
grant execute on function public.admin_marketing_list() to authenticated;
