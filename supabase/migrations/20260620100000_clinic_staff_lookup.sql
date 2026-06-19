-- Dono da clínica pode buscar usuário por e-mail para adicionar à equipe
create or replace function public.find_profile_by_email(p_email text)
returns table (user_id uuid, full_name text)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select p.id as user_id, p.full_name
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(trim(u.email)) = lower(trim(p_email))
  limit 1;
$$;

revoke all on function public.find_profile_by_email(text) from public;
grant execute on function public.find_profile_by_email(text) to authenticated;
