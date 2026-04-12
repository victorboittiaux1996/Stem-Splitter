-- Share links table
-- Allows Pro (3/month) and Studio (10/month) users to share stems publicly.
-- Free users have shareLinksPerMonth=0 and are blocked at the API level.

-- nanoid helper (safe random alphanumeric IDs, no extension required)
create or replace function nanoid(size int default 10)
returns text as $$
declare
  alphabet text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  idBuilder text := '';
  i int := 0;
  bytes bytea;
  byte int;
begin
  bytes := gen_random_bytes(size * 2);
  while i < size loop
    byte := get_byte(bytes, i);
    if byte < 62 * 4 then
      idBuilder := idBuilder || substr(alphabet, (byte % 62) + 1, 1);
      i := i + 1;
    end if;
    if i = size then exit; end if;
    i := i + 1;
  end loop;
  return left(idBuilder || encode(gen_random_bytes(size), 'base64'), size);
end;
$$ language plpgsql volatile;

create table if not exists share_links (
  id           text primary key default nanoid(10),
  user_id      uuid not null references auth.users(id) on delete cascade,
  job_id       text not null,
  workspace_id text,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz,
  view_count   integer not null default 0
);

-- Index for quota queries: count links per user in a date range
create index if not exists share_links_user_created_idx
  on share_links (user_id, created_at desc);

-- RLS
alter table share_links enable row level security;

-- Anyone can view a share link (public share page)
create policy "share_links_select_public"
  on share_links for select
  using (true);

-- Only the owner can insert
create policy "share_links_insert_owner"
  on share_links for insert
  with check (auth.uid() = user_id);

-- Only the owner can delete
create policy "share_links_delete_owner"
  on share_links for delete
  using (auth.uid() = user_id);

-- Atomic view count increment (called from public share page)
create or replace function increment_share_view_count(link_id text)
returns void as $$
begin
  update share_links set view_count = view_count + 1 where id = link_id;
end;
$$ language plpgsql security definer;
