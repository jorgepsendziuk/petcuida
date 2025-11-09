-- PetCuida initial schema migration
-- Creates core entities to manage pets, treatments and medication logs.

-- Enable required extensions
create extension if not exists "pgcrypto";

-- Enum types
do $$
begin
    if not exists (select 1 from pg_type where typname = 'pet_species') then
        create type public.pet_species as enum ('dog', 'cat', 'bird', 'small_pet', 'other');
    end if;

    if not exists (select 1 from pg_type where typname = 'pet_sex') then
        create type public.pet_sex as enum ('female', 'male', 'unknown');
    end if;

    if not exists (select 1 from pg_type where typname = 'treatment_kind') then
        create type public.treatment_kind as enum ('vaccine', 'deworming', 'tick_flea', 'general_medication', 'checkup');
    end if;

    if not exists (select 1 from pg_type where typname = 'treatment_status') then
        create type public.treatment_status as enum ('scheduled', 'completed', 'missed', 'cancelled');
    end if;
end
$$;

-- Trigger helper to maintain updated_at columns
create or replace function public.set_current_timestamp()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$;

-- Profiles table (1:1 with auth.users)
create table if not exists public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    full_name text,
    phone text,
    avatar_url text,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create trigger profiles_updated_at
    before update on public.profiles
    for each row
    execute procedure public.set_current_timestamp();

-- Pets
create table if not exists public.pets (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references public.profiles (id) on delete cascade,
    name text not null,
    species public.pet_species not null default 'dog',
    breed text,
    sex public.pet_sex not null default 'unknown',
    birthdate date,
    birthdate_estimated boolean not null default false,
    weight_kg numeric(5,2),
    color text,
    microchip_id text,
    notes text,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create trigger pets_updated_at
    before update on public.pets
    for each row
    execute procedure public.set_current_timestamp();

create index if not exists pets_owner_id_idx on public.pets(owner_id);

-- Pet photos
create table if not exists public.pet_photos (
    id uuid primary key default gen_random_uuid(),
    pet_id uuid not null references public.pets (id) on delete cascade,
    storage_path text not null,
    description text,
    captured_at timestamptz,
    created_at timestamptz not null default timezone('utc', now())
);

create index if not exists pet_photos_pet_id_idx on public.pet_photos(pet_id);

-- Catalog of recurring treatments/medications
create table if not exists public.treatment_templates (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid references public.profiles (id) on delete cascade,
    -- null owner_id means template is global/shared
    title text not null,
    kind public.treatment_kind not null,
    description text,
    manufacturer text,
    dosage text,
    route text,
    recommended_frequency_days integer check (recommended_frequency_days is null or recommended_frequency_days > 0),
    created_at timestamptz not null default timezone('utc', now())
);

create index if not exists treatment_templates_owner_idx on public.treatment_templates(owner_id);

-- Personalized treatment plan per pet
create table if not exists public.pet_treatments (
    id uuid primary key default gen_random_uuid(),
    pet_id uuid not null references public.pets (id) on delete cascade,
    template_id uuid references public.treatment_templates (id) on delete set null,
    kind public.treatment_kind not null,
    title text not null,
    description text,
    status public.treatment_status not null default 'scheduled',
    start_date date,
    due_date date,
    frequency_days integer check (frequency_days is null or frequency_days > 0),
    last_administered_at timestamptz,
    next_due_at timestamptz,
    notes text,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create trigger pet_treatments_updated_at
    before update on public.pet_treatments
    for each row
    execute procedure public.set_current_timestamp();

create index if not exists pet_treatments_pet_idx on public.pet_treatments(pet_id);
create index if not exists pet_treatments_due_idx on public.pet_treatments(next_due_at);

-- Treatment administration log
create table if not exists public.pet_treatment_logs (
    id uuid primary key default gen_random_uuid(),
    pet_treatment_id uuid not null references public.pet_treatments (id) on delete cascade,
    administered_at timestamptz not null,
    status public.treatment_status not null default 'completed',
    dosage text,
    batch_number text,
    administered_by text,
    notes text,
    created_at timestamptz not null default timezone('utc', now())
);

create index if not exists pet_treatment_logs_pet_treatment_idx on public.pet_treatment_logs(pet_treatment_id);

-- Reminders for upcoming medication/vaccination
create table if not exists public.reminders (
    id uuid primary key default gen_random_uuid(),
    pet_id uuid not null references public.pets (id) on delete cascade,
    pet_treatment_id uuid references public.pet_treatments (id) on delete set null,
    remind_at timestamptz not null,
    delivered_at timestamptz,
    channel text[] default array['in_app'],
    message text not null,
    created_at timestamptz not null default timezone('utc', now())
);

create index if not exists reminders_pet_idx on public.reminders(pet_id);
create index if not exists reminders_remind_at_idx on public.reminders(remind_at);

-- Utility view combining upcoming reminders per pet
create or replace view public.vw_pet_care_status as
select
    p.id as pet_id,
    p.owner_id,
    p.name,
    coalesce(pt.title, r.message) as title,
    coalesce(pt.kind::text, 'reminder') as kind,
    r.remind_at,
    pt.next_due_at,
    pt.status,
    pt.frequency_days,
    greatest(
        coalesce(pt.next_due_at, r.remind_at),
        coalesce(r.remind_at, pt.next_due_at)
    ) as next_event_at
from public.pets p
left join public.pet_treatments pt on pt.pet_id = p.id
left join public.reminders r on r.pet_id = p.id and r.delivered_at is null;

-- RLS policies
alter table public.profiles enable row level security;
alter table public.pets enable row level security;
alter table public.pet_photos enable row level security;
alter table public.treatment_templates enable row level security;
alter table public.pet_treatments enable row level security;
alter table public.pet_treatment_logs enable row level security;
alter table public.reminders enable row level security;

-- Profiles: each user manages own profile
create policy "Users can view their profile" on public.profiles
    for select using ( auth.uid() = id );

create policy "Users can update their profile" on public.profiles
    for update using ( auth.uid() = id ) with check ( auth.uid() = id );

create policy "Allow insert for own profile" on public.profiles
    for insert with check ( auth.uid() = id );

-- Pets policies
create policy "Users view own pets" on public.pets
    for select using ( auth.uid() = owner_id );

create policy "Users modify own pets" on public.pets
    for all using ( auth.uid() = owner_id ) with check ( auth.uid() = owner_id );

-- Pet photos
create policy "Users manage pet photos" on public.pet_photos
    for all using (
        exists (
            select 1 from public.pets p
            where p.id = pet_photos.pet_id
              and p.owner_id = auth.uid()
        )
    ) with check (
        exists (
            select 1 from public.pets p
            where p.id = pet_photos.pet_id
              and p.owner_id = auth.uid()
        )
    );

-- Treatment templates
create policy "Users read templates" on public.treatment_templates
    for select using (
        owner_id is null or owner_id = auth.uid()
    );

create policy "Users manage own templates" on public.treatment_templates
    for all using ( owner_id = auth.uid() ) with check ( owner_id = auth.uid() );

-- Pet treatments
create policy "Users view pet treatments" on public.pet_treatments
    for select using (
        exists (
            select 1 from public.pets p
            where p.id = pet_treatments.pet_id
              and p.owner_id = auth.uid()
        )
    );

create policy "Users manage pet treatments" on public.pet_treatments
    for all using (
        exists (
            select 1 from public.pets p
            where p.id = pet_treatments.pet_id
              and p.owner_id = auth.uid()
        )
    ) with check (
        exists (
            select 1 from public.pets p
            where p.id = pet_treatments.pet_id
              and p.owner_id = auth.uid()
        )
    );

-- Treatment logs
create policy "Users manage treatment logs" on public.pet_treatment_logs
    for all using (
        exists (
            select 1 from public.pet_treatments pt
            join public.pets p on p.id = pt.pet_id
            where pt.id = pet_treatment_logs.pet_treatment_id
              and p.owner_id = auth.uid()
        )
    ) with check (
        exists (
            select 1 from public.pet_treatments pt
            join public.pets p on p.id = pt.pet_id
            where pt.id = pet_treatment_logs.pet_treatment_id
              and p.owner_id = auth.uid()
        )
    );

-- Reminders
create policy "Users manage reminders" on public.reminders
    for all using (
        exists (
            select 1 from public.pets p
            where p.id = reminders.pet_id
              and p.owner_id = auth.uid()
        )
    ) with check (
        exists (
            select 1 from public.pets p
            where p.id = reminders.pet_id
              and p.owner_id = auth.uid()
        )
    );

-- Helper function to ensure profile row exists on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.profiles (id, full_name, avatar_url)
    values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url')
    on conflict (id) do update
        set full_name = excluded.full_name,
            avatar_url = excluded.avatar_url,
            updated_at = timezone('utc', now());
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute procedure public.handle_new_user();

-- Function to register treatment administration and update schedules
create or replace function public.log_pet_treatment(
    p_pet_treatment_id uuid,
    p_administered_at timestamptz,
    p_status public.treatment_status default 'completed',
    p_dosage text default null,
    p_batch_number text default null,
    p_administered_by text default null,
    p_notes text default null
)
returns public.pet_treatment_logs
language plpgsql
security definer
set search_path = public
as $$
declare
    v_owner_id uuid;
    v_frequency integer;
    v_log public.pet_treatment_logs;
begin
    select p.owner_id, pt.frequency_days
    into v_owner_id, v_frequency
    from public.pet_treatments pt
    join public.pets p on p.id = pt.pet_id
    where pt.id = p_pet_treatment_id;

    if v_owner_id is null then
        raise exception 'Treatment not found';
    end if;

    if v_owner_id <> auth.uid() then
        raise exception 'Not authorized';
    end if;

    insert into public.pet_treatment_logs (
        pet_treatment_id,
        administered_at,
        status,
        dosage,
        batch_number,
        administered_by,
        notes
    )
    values (
        p_pet_treatment_id,
        coalesce(p_administered_at, timezone('utc', now())),
        coalesce(p_status, 'completed'),
        p_dosage,
        p_batch_number,
        p_administered_by,
        p_notes
    )
    returning * into v_log;

    update public.pet_treatments
    set
        last_administered_at = v_log.administered_at,
        status = v_log.status,
        next_due_at = case
            when v_log.status = 'completed' and v_frequency is not null then
                v_log.administered_at + (v_frequency || ' days')::interval
            else next_due_at
        end
    where id = p_pet_treatment_id;

    return v_log;
end;
$$;

grant execute on function public.log_pet_treatment(uuid, timestamptz, public.treatment_status, text, text, text, text)
to authenticated, service_role;

