-- Fase 1: Portal clínica + compartilhamento tutor (LGPD-PET)
-- CPF opcional, pedidos de acesso, grants com expiração, alterações pendentes

-- CPF opcional no perfil (habilita compartilhamento com clínicas)
alter table public.profiles
  add column if not exists cpf text,
  add column if not exists cpf_share_enabled boolean not null default false;

create unique index if not exists profiles_cpf_unique_idx
  on public.profiles (cpf)
  where cpf is not null;

-- Normalizar CPF: apenas dígitos
create or replace function public.normalize_cpf(raw text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(coalesce(raw, ''), '\D', '', 'g'), '');
$$;

create or replace function public.profiles_normalize_cpf()
returns trigger
language plpgsql
as $$
begin
  if new.cpf is not null then
    new.cpf := public.normalize_cpf(new.cpf);
    if length(new.cpf) <> 11 then
      raise exception 'CPF deve ter 11 dígitos';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_normalize_cpf on public.profiles;
create trigger profiles_normalize_cpf
  before insert or update of cpf on public.profiles
  for each row
  execute procedure public.profiles_normalize_cpf();

-- Clínicas
create table if not exists public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  phone text,
  email text,
  address_line text,
  city text,
  state text,
  zip_code text,
  is_public boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger clinics_updated_at
  before update on public.clinics
  for each row
  execute procedure public.set_current_timestamp();

create index if not exists clinics_public_idx on public.clinics(is_public) where is_public = true;

-- Membros da clínica
create type public.clinic_member_role as enum ('owner', 'staff');

create table if not exists public.clinic_members (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.clinic_member_role not null default 'staff',
  created_at timestamptz not null default timezone('utc', now()),
  unique (clinic_id, user_id)
);

create index if not exists clinic_members_user_idx on public.clinic_members(user_id);
create index if not exists clinic_members_clinic_idx on public.clinic_members(clinic_id);

-- Pedidos de acesso (clínica → pet do tutor)
create type public.pet_access_request_status as enum ('pending', 'approved', 'rejected', 'cancelled');

create table if not exists public.pet_access_requests (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  pet_id uuid not null references public.pets (id) on delete cascade,
  tutor_id uuid not null references public.profiles (id) on delete cascade,
  requested_by uuid not null references public.profiles (id) on delete cascade,
  status public.pet_access_request_status not null default 'pending',
  message text,
  responded_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger pet_access_requests_updated_at
  before update on public.pet_access_requests
  for each row
  execute procedure public.set_current_timestamp();

create index if not exists pet_access_requests_tutor_idx on public.pet_access_requests(tutor_id);
create index if not exists pet_access_requests_clinic_idx on public.pet_access_requests(clinic_id);
create unique index if not exists pet_access_requests_pending_unique_idx
  on public.pet_access_requests (clinic_id, pet_id)
  where status = 'pending';

-- Permissões ativas (LGPD-PET: pode expirar)
create table if not exists public.pet_access_grants (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  pet_id uuid not null references public.pets (id) on delete cascade,
  tutor_id uuid not null references public.profiles (id) on delete cascade,
  granted_by uuid not null references public.profiles (id) on delete cascade,
  request_id uuid references public.pet_access_requests (id) on delete set null,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (clinic_id, pet_id)
);

create index if not exists pet_access_grants_clinic_idx on public.pet_access_grants(clinic_id);
create index if not exists pet_access_grants_pet_idx on public.pet_access_grants(pet_id);
create index if not exists pet_access_grants_tutor_idx on public.pet_access_grants(tutor_id);

-- Alterações pendentes (antes do tutor liberar ou para revisão)
create type public.pet_pending_change_status as enum ('pending', 'approved', 'rejected');

create table if not exists public.pet_pending_changes (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  pet_id uuid references public.pets (id) on delete cascade,
  tutor_id uuid references public.profiles (id) on delete set null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  change_type text not null,
  payload jsonb not null default '{}',
  status public.pet_pending_change_status not null default 'pending',
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger pet_pending_changes_updated_at
  before update on public.pet_pending_changes
  for each row
  execute procedure public.set_current_timestamp();

create index if not exists pet_pending_changes_clinic_idx on public.pet_pending_changes(clinic_id);
create index if not exists pet_pending_changes_tutor_idx on public.pet_pending_changes(tutor_id);
create index if not exists pet_pending_changes_status_idx on public.pet_pending_changes(status);

-- Auditoria básica
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  clinic_id uuid references public.clinics (id) on delete set null,
  pet_id uuid references public.pets (id) on delete set null,
  action text not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists audit_log_pet_idx on public.audit_log(pet_id);
create index if not exists audit_log_clinic_idx on public.audit_log(clinic_id);

-- Helpers
create or replace function public.is_clinic_member(p_clinic_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.clinic_members cm
    where cm.clinic_id = p_clinic_id and cm.user_id = p_user_id
  );
$$;

create or replace function public.has_active_pet_grant(p_clinic_id uuid, p_pet_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.pet_access_grants g
    where g.clinic_id = p_clinic_id
      and g.pet_id = p_pet_id
      and g.revoked_at is null
      and (g.expires_at is null or g.expires_at > timezone('utc', now()))
  );
$$;

-- Busca tutor por CPF (só retorna se compartilhamento habilitado)
create or replace function public.find_tutor_by_cpf(p_cpf text)
returns table (
  tutor_id uuid,
  full_name text,
  pet_id uuid,
  pet_name text,
  pet_species public.pet_species
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pr.id as tutor_id,
    pr.full_name,
    p.id as pet_id,
    p.name as pet_name,
    p.species as pet_species
  from public.profiles pr
  join public.pets p on p.owner_id = pr.id
  where pr.cpf_share_enabled = true
    and pr.cpf = public.normalize_cpf(p_cpf)
    and public.is_clinic_member(
      (select cm.clinic_id from public.clinic_members cm where cm.user_id = auth.uid() limit 1),
      auth.uid()
    );
$$;

revoke all on function public.find_tutor_by_cpf(text) from public;
grant execute on function public.find_tutor_by_cpf(text) to authenticated;

-- RLS
alter table public.clinics enable row level security;
alter table public.clinic_members enable row level security;
alter table public.pet_access_requests enable row level security;
alter table public.pet_access_grants enable row level security;
alter table public.pet_pending_changes enable row level security;
alter table public.audit_log enable row level security;

-- Clinics: públicas para leitura; membros gerenciam a sua
create policy "Anyone can view public clinics" on public.clinics
  for select using (is_public = true);

create policy "Members view own clinic" on public.clinics
  for select using (public.is_clinic_member(id));

create policy "Owners update clinic" on public.clinics
  for update using (
    exists (
      select 1 from public.clinic_members cm
      where cm.clinic_id = clinics.id and cm.user_id = auth.uid() and cm.role = 'owner'
    )
  );

create policy "Authenticated users create clinic" on public.clinics
  for insert to authenticated with check (true);

-- Clinic members
create policy "Members view clinic roster" on public.clinic_members
  for select using (public.is_clinic_member(clinic_id));

create policy "Users view own membership" on public.clinic_members
  for select using (user_id = auth.uid());

create policy "Owners manage members" on public.clinic_members
  for all using (
    exists (
      select 1 from public.clinic_members cm
      where cm.clinic_id = clinic_members.clinic_id and cm.user_id = auth.uid() and cm.role = 'owner'
    )
  );

create policy "User joins as owner on create" on public.clinic_members
  for insert to authenticated with check (user_id = auth.uid());

-- Access requests
create policy "Tutor views own requests" on public.pet_access_requests
  for select using (tutor_id = auth.uid());

create policy "Clinic members view clinic requests" on public.pet_access_requests
  for select using (public.is_clinic_member(clinic_id));

create policy "Clinic members create requests" on public.pet_access_requests
  for insert to authenticated with check (
    public.is_clinic_member(clinic_id) and requested_by = auth.uid()
  );

create policy "Tutor responds requests" on public.pet_access_requests
  for update using (tutor_id = auth.uid()) with check (tutor_id = auth.uid());

-- Grants
create policy "Tutor views own grants" on public.pet_access_grants
  for select using (tutor_id = auth.uid());

create policy "Clinic members view grants" on public.pet_access_grants
  for select using (public.is_clinic_member(clinic_id));

create policy "Tutor manages grants" on public.pet_access_grants
  for all using (tutor_id = auth.uid()) with check (tutor_id = auth.uid());

-- Pending changes
create policy "Tutor views pending for own pets" on public.pet_pending_changes
  for select using (tutor_id = auth.uid());

create policy "Clinic members view clinic pending" on public.pet_pending_changes
  for select using (public.is_clinic_member(clinic_id));

create policy "Clinic members create pending" on public.pet_pending_changes
  for insert to authenticated with check (
    public.is_clinic_member(clinic_id) and created_by = auth.uid()
  );

create policy "Tutor reviews pending" on public.pet_pending_changes
  for update using (tutor_id = auth.uid()) with check (tutor_id = auth.uid());

-- Audit: tutor vê do seu pet; clínica vê da clínica
create policy "Tutor views pet audit" on public.audit_log
  for select using (
    exists (
      select 1 from public.pets p
      where p.id = audit_log.pet_id and p.owner_id = auth.uid()
    )
  );

create policy "Clinic views clinic audit" on public.audit_log
  for select using (public.is_clinic_member(clinic_id));

create policy "Authenticated insert audit" on public.audit_log
  for insert to authenticated with check (actor_id = auth.uid());

-- Estender pets: clínica com grant ativo pode ver
create policy "Clinic views granted pets" on public.pets
  for select using (
    exists (
      select 1 from public.pet_access_grants g
      join public.clinic_members cm on cm.clinic_id = g.clinic_id
      where g.pet_id = pets.id
        and cm.user_id = auth.uid()
        and g.revoked_at is null
        and (g.expires_at is null or g.expires_at > timezone('utc', now()))
    )
  );

-- Estender pet_treatments: clínica com grant pode ver e inserir
create policy "Clinic views granted treatments" on public.pet_treatments
  for select using (
    exists (
      select 1 from public.pet_access_grants g
      join public.clinic_members cm on cm.clinic_id = g.clinic_id
      where g.pet_id = pet_treatments.pet_id
        and cm.user_id = auth.uid()
        and g.revoked_at is null
        and (g.expires_at is null or g.expires_at > timezone('utc', now()))
    )
  );

create policy "Clinic adds granted treatments" on public.pet_treatments
  for insert to authenticated with check (
    exists (
      select 1 from public.pet_access_grants g
      join public.clinic_members cm on cm.clinic_id = g.clinic_id
      where g.pet_id = pet_treatments.pet_id
        and cm.user_id = auth.uid()
        and g.revoked_at is null
        and (g.expires_at is null or g.expires_at > timezone('utc', now()))
    )
  );
