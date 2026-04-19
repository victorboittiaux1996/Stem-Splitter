alter table public.jobs
  add column if not exists modal_cost float;

comment on column public.jobs.modal_cost is 'Per-job GPU cost in USD, calculated in Modal worker as (total_wall_time + container_boot) × H100 rate';
