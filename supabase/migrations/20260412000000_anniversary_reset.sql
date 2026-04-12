-- Add period_start to subscriptions table.
-- Stores the billing cycle anchor date (currentPeriodStart from Polar webhook).
-- Free users fall back to profiles.created_at — no column needed there.
alter table public.subscriptions
  add column if not exists period_start date;

-- Backfill existing usage rows: convert old "YYYY-MM" calendar-month keys
-- to the "YYYY-MM-DD" anniversary format (anchored on the 1st).
-- Safe to run multiple times (WHERE guard prevents double-processing).
update public.usage
  set month = month || '-01'
  where month ~ '^\d{4}-\d{2}$';
