-- Atomic usage increment to avoid read-then-write race condition.
-- Changes tracks_used from int to numeric to support fractional minutes.

alter table public.usage
  alter column tracks_used type numeric using tracks_used::numeric;

alter table public.usage
  alter column tracks_used set default 0;

create or replace function public.increment_usage(
  p_user_id uuid,
  p_month text,
  p_minutes numeric
)
returns void as $$
begin
  insert into public.usage (user_id, month, tracks_used)
  values (p_user_id, p_month, p_minutes)
  on conflict (user_id, month)
  do update set tracks_used = public.usage.tracks_used + excluded.tracks_used;
end;
$$ language plpgsql security definer;
