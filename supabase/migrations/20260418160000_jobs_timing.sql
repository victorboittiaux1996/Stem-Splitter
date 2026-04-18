-- Add per-job timing, error, and monitoring columns for Telegram bot analytics
alter table public.jobs
  add column if not exists duration_seconds float,
  add column if not exists error_code text,
  add column if not exists phase_timings jsonb,
  add column if not exists cold_start boolean;

-- Indexes for monitoring queries (recent jobs, filtering by status)
create index if not exists jobs_created_at_idx on public.jobs(created_at desc);
create index if not exists jobs_status_idx on public.jobs(status);
