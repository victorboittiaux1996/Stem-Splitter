-- 44Stems initial schema
-- Uses Supabase Auth (auth.users) as the source of truth for users.

-- Profiles: public user data synced from auth.users via trigger
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Subscriptions: tracks Stripe subscription state
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  plan text not null default 'free' check (plan in ('free', 'pro', 'studio')),
  status text not null default 'active' check (status in ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.subscriptions enable row level security;

create policy "Users can read own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create unique index subscriptions_user_id_idx on public.subscriptions(user_id);

-- Jobs: tracks separation jobs
create table public.jobs (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id text not null,
  file_name text,
  status text not null default 'pending' check (status in ('pending', 'uploading', 'processing', 'completed', 'failed')),
  mode text,
  format text,
  stems_count int,
  bpm real,
  key text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

alter table public.jobs enable row level security;

create policy "Users can read own jobs"
  on public.jobs for select using (auth.uid() = user_id);

create policy "Users can insert own jobs"
  on public.jobs for insert with check (auth.uid() = user_id);

create policy "Users can update own jobs"
  on public.jobs for update using (auth.uid() = user_id);

create index jobs_user_id_idx on public.jobs(user_id);

-- Usage: monthly track count per user
create table public.usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null,
  tracks_used int not null default 0,
  unique(user_id, month)
);

alter table public.usage enable row level security;

create policy "Users can read own usage"
  on public.usage for select using (auth.uid() = user_id);

-- User preferences
create table public.preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_stems int default 4 check (default_stems in (2, 4, 6)),
  default_format text default 'wav' check (default_format in ('wav', 'mp3')),
  notifications_enabled boolean default true,
  updated_at timestamptz default now()
);

alter table public.preferences enable row level security;

create policy "Users can read own preferences"
  on public.preferences for select using (auth.uid() = user_id);

create policy "Users can upsert own preferences"
  on public.preferences for insert with check (auth.uid() = user_id);

create policy "Users can update own preferences"
  on public.preferences for update using (auth.uid() = user_id);
