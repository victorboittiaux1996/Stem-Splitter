-- Track Polar cancel_at_period_end flag so app can distinguish "active, will renew"
-- vs "active, will cancel at endsAt". Without this column the webhook sets status
-- to "canceled" on every subscription.canceled event, which is wrong: Polar keeps
-- the sub active until endsAt. This column lets the app show the correct state.

alter table subscriptions
  add column if not exists cancel_at_period_end boolean not null default false;

-- Partial index: most rows are false, the few true ones are what we query for.
create index if not exists idx_subscriptions_cancel_at_period_end
  on subscriptions(cancel_at_period_end)
  where cancel_at_period_end = true;

-- Webhook idempotency: Polar retries webhooks with backoff. Without an event_id
-- dedupe table, a late retry of subscription.canceled could overwrite a more
-- recent subscription.revoked and restore access the user should not have.
-- This table records every processed event so retries become no-ops.
create table if not exists webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

-- TTL via app-side cleanup is fine; we don't need a job. Index for potential future
-- reporting queries.
create index if not exists idx_webhook_events_processed_at
  on webhook_events(processed_at desc);

-- NOTE: no backfill here. Users whose rows were mislabeled status='canceled' under
-- the previous buggy webhook need a reconciliation pass that queries Polar per row
-- to distinguish scheduled cancel from hard revoke. That is deliberately a separate
-- script, not a blanket SQL UPDATE, because some rows may be legitimately revoked.
