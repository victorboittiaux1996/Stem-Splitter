-- Fix nanoid: previous implementation could produce '+', '/', '=' from base64 fallback,
-- causing broken share URLs. New version loops until exactly `size` safe chars are collected.

create or replace function nanoid(size int default 10)
returns text as $$
declare
  alphabet text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result   text := '';
  bytes    bytea;
  byte     int;
  idx      int;
begin
  while length(result) < size loop
    bytes := gen_random_bytes(size * 3);
    idx := 0;
    while idx < octet_length(bytes) and length(result) < size loop
      byte := get_byte(bytes, idx);
      -- rejection sampling: only accept bytes that map uniformly into 62 chars
      if byte < 62 * 4 then
        result := result || substr(alphabet, (byte % 62) + 1, 1);
      end if;
      idx := idx + 1;
    end loop;
  end loop;
  return result;
end;
$$ language plpgsql volatile;
