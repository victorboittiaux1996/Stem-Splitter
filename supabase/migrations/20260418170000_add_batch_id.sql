ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS batch_id text;
CREATE INDEX IF NOT EXISTS jobs_batch_id_idx ON public.jobs (batch_id) WHERE batch_id IS NOT NULL;
