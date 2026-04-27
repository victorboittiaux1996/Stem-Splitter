-- Update ensure_period_with_rollover behaviour:
--   1. No cap on rollover_minutes — paid plans accumulate unused minutes
--      indefinitely (the "Minutes never reset" promise).
--   2. Downgrades (when the new plan's plan_minutes is smaller than the previous
--      period's plan_minutes) forfeit all leftover minutes — the new period
--      starts fresh at the target plan's quota with rollover = 0.
--
-- The Stripe webhook is the primary owner of plan-transition resets; this
-- function is a safety net invoked from the job-completion path so the row
-- exists before tracks_used is incremented.

create or replace function public.ensure_period_with_rollover(
  p_user_id uuid,
  p_prev_month text,
  p_new_month text,
  p_plan_minutes numeric
) returns void as $$
declare
  v_prev_used numeric := 0;
  v_prev_rollover numeric := 0;
  v_prev_plan_minutes numeric := 0;
  v_rollover numeric;
begin
  select
    coalesce(tracks_used, 0),
    coalesce(rollover_minutes, 0),
    coalesce(plan_minutes, 0)
  into v_prev_used, v_prev_rollover, v_prev_plan_minutes
  from public.usage
  where user_id = p_user_id and month = p_prev_month;

  if p_plan_minutes < v_prev_plan_minutes then
    -- Downgrade: forfeit all leftover minutes.
    v_rollover := 0;
  elsif v_prev_plan_minutes > 0 and v_prev_plan_minutes <= 10 and p_plan_minutes > v_prev_plan_minutes then
    -- Free → paid plan: Free has minutesNeverReset=false, so no carry-over.
    -- Detect by previous plan_minutes ≤ 10 (Free's quota). The Stripe webhook
    -- is the primary owner of this transition; this branch is the fallback
    -- when the webhook hasn't landed yet by the time a split runs.
    v_rollover := 0;
  else
    -- Same paid plan (renewal) or paid→paid upgrade: carry over the previous
    -- period's leftover. No cap.
    v_rollover := greatest(0, v_prev_plan_minutes + v_prev_rollover - v_prev_used);
  end if;

  insert into public.usage (user_id, month, tracks_used, rollover_minutes, plan_minutes)
  values (p_user_id, p_new_month, 0, v_rollover, p_plan_minutes)
  on conflict (user_id, month) do nothing;
end;
$$ language plpgsql;
