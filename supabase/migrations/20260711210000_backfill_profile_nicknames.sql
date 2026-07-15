create or replace function public.normalize_nickname_part(value text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    lower(
      translate(
        coalesce(split_part(trim(value), ' ', 1), ''),
        'áàäâãåéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÅÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
        'aaaaaaeeeeiiiiooooouuuuncAAAAAAEEEEIIIIOOOOOUUUUNC'
      )
    ),
    '[^a-z0-9]',
    '',
    'g'
  );
$$;

create or replace function public.build_profile_nickname_base(name text, last_name text)
returns text
language sql
immutable
as $$
  select case
    when public.normalize_nickname_part(name) <> ''
      and public.normalize_nickname_part(last_name) <> ''
    then public.normalize_nickname_part(name) || '-' || public.normalize_nickname_part(last_name)
    else null
  end;
$$;

with all_profiles as (
  select
    id,
    nickname,
    created_at,
    public.build_profile_nickname_base(name, last_name) as nickname_base
  from public.profiles
),
ranked as (
  select
    id,
    nickname,
    nickname_base,
    row_number() over (
      partition by nickname_base
      order by created_at asc, id asc
    ) as profile_rank
  from all_profiles
  where nickname_base is not null
),
computed as (
  select
    id,
    case
      when profile_rank = 1 then nickname_base
      else nickname_base || lpad(profile_rank::text, 2, '0')
    end as new_nickname
  from ranked
  where nickname is null or btrim(nickname) = ''
)
update public.profiles as profiles
set nickname = computed.new_nickname
from computed
where profiles.id = computed.id;

update auth.users as users
set raw_user_meta_data = coalesce(users.raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object('nickname', profiles.nickname)
from public.profiles as profiles
where users.id = profiles.id
  and profiles.nickname is not null
  and btrim(profiles.nickname) <> '';
