alter table public.profiles
  add column if not exists nickname text;

create unique index if not exists profiles_nickname_unique_idx
  on public.profiles (lower(nickname))
  where nickname is not null and nickname <> '';
