-- Stripe migration — replace Polar billing provider.
-- Adds columns needed for Stripe: currency (multi-currency), billing_interval
-- (stop inferring from period length), price_id (Stripe Price for upgrades).
-- stripe_customer_id + stripe_subscription_id already exist (legacy Polar names,
-- now correctly meaningful on Stripe).

alter table subscriptions
  add column if not exists currency text default 'usd',
  add column if not exists billing_interval text default 'month',
  add column if not exists price_id text;

alter table subscriptions
  add constraint subscriptions_billing_interval_check
  check (billing_interval in ('month', 'year'));

comment on column subscriptions.currency is 'ISO 4217 lowercase: usd, eur, gbp';
comment on column subscriptions.billing_interval is 'month or year — source of truth, not derived';
comment on column subscriptions.price_id is 'Stripe Price id (price_xxx)';
