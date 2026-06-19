-- Corrige recursão infinita em RLS que impedia tutors de listar seus pets.
-- Causa: policies em pets/clinic_members consultavam clinic_members diretamente,
-- disparando "Members view clinic roster" → is_clinic_member → clinic_members → loop.

-- Garante que helpers SECURITY DEFINER ignorem RLS (PG15+)
create or replace function public.is_clinic_member(p_clinic_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1 from public.clinic_members cm
    where cm.clinic_id = p_clinic_id and cm.user_id = p_user_id
  );
$$;

create or replace function public.is_clinic_owner(p_clinic_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1 from public.clinic_members cm
    where cm.clinic_id = p_clinic_id
      and cm.user_id = p_user_id
      and cm.role = 'owner'
  );
$$;

create or replace function public.has_active_pet_grant(p_clinic_id uuid, p_pet_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1 from public.pet_access_grants g
    where g.clinic_id = p_clinic_id
      and g.pet_id = p_pet_id
      and g.revoked_at is null
      and (g.expires_at is null or g.expires_at > timezone('utc', now()))
  );
$$;

-- clinic_members: remove policy que causava recursão
drop policy if exists "Members view clinic roster" on public.clinic_members;

drop policy if exists "Owners manage members" on public.clinic_members;
create policy "Owners manage members" on public.clinic_members
  for all using (public.is_clinic_owner(clinic_id))
  with check (public.is_clinic_owner(clinic_id));

-- Membros da mesma clínica podem ver o roster (via helper, sem recursão)
create policy "Members view clinic roster" on public.clinic_members
  for select using (public.is_clinic_member(clinic_id));

-- pets: usar helper em vez de JOIN direto em clinic_members
drop policy if exists "Clinic views granted pets" on public.pets;
create policy "Clinic views granted pets" on public.pets
  for select using (
    exists (
      select 1 from public.pet_access_grants g
      where g.pet_id = pets.id
        and public.is_clinic_member(g.clinic_id)
        and g.revoked_at is null
        and (g.expires_at is null or g.expires_at > timezone('utc', now()))
    )
  );

-- pet_treatments: idem
drop policy if exists "Clinic views granted treatments" on public.pet_treatments;
create policy "Clinic views granted treatments" on public.pet_treatments
  for select using (
    exists (
      select 1 from public.pet_access_grants g
      where g.pet_id = pet_treatments.pet_id
        and public.is_clinic_member(g.clinic_id)
        and g.revoked_at is null
        and (g.expires_at is null or g.expires_at > timezone('utc', now()))
    )
  );

drop policy if exists "Clinic adds granted treatments" on public.pet_treatments;
create policy "Clinic adds granted treatments" on public.pet_treatments
  for insert to authenticated with check (
    exists (
      select 1 from public.pet_access_grants g
      where g.pet_id = pet_treatments.pet_id
        and public.is_clinic_member(g.clinic_id)
        and g.revoked_at is null
        and (g.expires_at is null or g.expires_at > timezone('utc', now()))
    )
  );

-- clinics update: evitar subquery direta em clinic_members
drop policy if exists "Owners update clinic" on public.clinics;
create policy "Owners update clinic" on public.clinics
  for update using (public.is_clinic_owner(id));
