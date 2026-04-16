-- Rollover minutes: unused minutes carry over to the next billing period.
-- Only applies to Pro/Studio (minutesNeverReset = true). Free users always reset.
--
-- Logic:
--   rollover = min(max(0, prev_plan_minutes + prev_rollover - prev_used), new_plan_minutes)
--   Capped at new plan's quota — handles downgrades naturally (Studio→Pro caps at 90).
--   First period → no previous row → rollover = 0 (correct).
--
-- Cancelled users: when plan reverts to Free, minutesNeverReset=false → ensure_period_with_rollover
--   is never called → rollover stays 0. Minutes expire at end of paid period. ✓

alter table public.usage
  add column if not exists rollover_minutes numeric default 0,
  add column if not exists plan_minutes numeric default 0;

-- ensure_period_with_rollover: idempotent — creates the new period row only once,
-- computing rollover from the previous period. Safe to call multiple times per period.
create or replace function public.ensure_period_with_rollover(
  p_user_id      uuid,
  p_new_month    text,
  p_prev_month   text,
  p_plan_minutes numeric
) returns void as $$
declare
  v_prev_used         numeric := 0;
  v_prev_rollover     numeric := 0;
  v_prev_plan_minutes numeric := 0;
  v_rollover          numeric := 0;
begin
  -- Read previous period (no row = first period, all zeros → rollover = 0)
  select
    coalesce(tracks_used, 0),
    coalesce(rollover_minutes, 0),
    coalesce(plan_minutes, 0)
  into v_prev_used, v_prev_rollover, v_prev_plan_minutes
  from public.usage
  where user_id = p_user_id and month = p_prev_month;

  -- Rollover = unused minutes from prev period, capped at new plan quota (downgrade safety)
  v_rollover := least(
    greatest(0, v_prev_plan_minutes + v_prev_rollover - v_prev_used),
    p_plan_minutes
  );

  -- Insert new period row with rollover — no-op if row already exists (idempotent)
  insert into public.usage (user_id, month, tracks_used, rollover_minutes, plan_minutes)
  values (p_user_id, p_new_month, 0, v_rollover, p_plan_minutes)
  on conflict (user_id, month) do nothing;
end;
$$ language plpgsql security definer;

-- Backfill plan_minutes for all existing usage rows belonging to active paid users.
-- Without this, their current-period row has plan_minutes=0, which would cause
-- ensure_period_with_rollover to compute rollover=0 at next period boundary
-- (formula: min(max(0, 0 + 0 - used), new_plan) = 0).
-- Safe to run multiple times (WHERE plan_minutes = 0 prevents double-processing).
update public.usage u
set plan_minutes = case s.plan
  when 'pro'    then 90
  when 'studio' then 250
  else 0
end
from public.subscriptions s
where u.user_id = s.user_id
  and s.status = 'active'
  and s.plan in ('pro', 'studio')
  and u.plan_minutes = 0;
