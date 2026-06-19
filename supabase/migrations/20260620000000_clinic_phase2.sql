-- Fase 1 lacunas + Fase 2: prescriptions RLS, agenda, lembretes clínica

-- ---------------------------------------------------------------------------
-- pet_prescriptions + prescription_medications: RLS (faltava)
-- ---------------------------------------------------------------------------
alter table public.pet_prescriptions enable row level security;
alter table public.prescription_medications enable row level security;

drop policy if exists "Users view own prescriptions" on public.pet_prescriptions;
create policy "Users view own prescriptions" on public.pet_prescriptions
  for select to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists "Users manage own prescriptions" on public.pet_prescriptions;
create policy "Users manage own prescriptions" on public.pet_prescriptions
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "Clinic views granted prescriptions" on public.pet_prescriptions;
create policy "Clinic views granted prescriptions" on public.pet_prescriptions
  for select to authenticated
  using (
    exists (
      select 1 from public.pet_access_grants g
      where g.pet_id = pet_prescriptions.pet_id
        and public.is_clinic_member(g.clinic_id)
        and g.revoked_at is null
        and (g.expires_at is null or g.expires_at > timezone('utc', now()))
    )
  );

drop policy if exists "Clinic adds granted prescriptions" on public.pet_prescriptions;
create policy "Clinic adds granted prescriptions" on public.pet_prescriptions
  for insert to authenticated
  with check (
    exists (
      select 1 from public.pet_access_grants g
      where g.pet_id = pet_prescriptions.pet_id
        and public.is_clinic_member(g.clinic_id)
        and g.revoked_at is null
        and (g.expires_at is null or g.expires_at > timezone('utc', now()))
    )
  );

drop policy if exists "Users view own prescription meds" on public.prescription_medications;
create policy "Users view own prescription meds" on public.prescription_medications
  for select to authenticated
  using (
    exists (
      select 1 from public.pet_prescriptions pp
      where pp.id = prescription_medications.prescription_id
        and pp.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users manage own prescription meds" on public.prescription_medications;
create policy "Users manage own prescription meds" on public.prescription_medications
  for all to authenticated
  using (
    exists (
      select 1 from public.pet_prescriptions pp
      where pp.id = prescription_medications.prescription_id
        and pp.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.pet_prescriptions pp
      where pp.id = prescription_medications.prescription_id
        and pp.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Clinic views granted prescription meds" on public.prescription_medications;
create policy "Clinic views granted prescription meds" on public.prescription_medications
  for select to authenticated
  using (
    exists (
      select 1 from public.pet_prescriptions pp
      join public.pet_access_grants g on g.pet_id = pp.pet_id
      where pp.id = prescription_medications.prescription_id
        and public.is_clinic_member(g.clinic_id)
        and g.revoked_at is null
        and (g.expires_at is null or g.expires_at > timezone('utc', now()))
    )
  );

drop policy if exists "Clinic adds granted prescription meds" on public.prescription_medications;
create policy "Clinic adds granted prescription meds" on public.prescription_medications
  for insert to authenticated
  with check (
    exists (
      select 1 from public.pet_prescriptions pp
      join public.pet_access_grants g on g.pet_id = pp.pet_id
      where pp.id = prescription_medications.prescription_id
        and public.is_clinic_member(g.clinic_id)
        and g.revoked_at is null
        and (g.expires_at is null or g.expires_at > timezone('utc', now()))
    )
  );

-- ---------------------------------------------------------------------------
-- reminders: clínica com grant pode ver e criar lembretes de retorno
-- ---------------------------------------------------------------------------
drop policy if exists "Clinic views granted reminders" on public.reminders;
create policy "Clinic views granted reminders" on public.reminders
  for select to authenticated
  using (
    exists (
      select 1 from public.pet_access_grants g
      where g.pet_id = reminders.pet_id
        and public.is_clinic_member(g.clinic_id)
        and g.revoked_at is null
        and (g.expires_at is null or g.expires_at > timezone('utc', now()))
    )
  );

drop policy if exists "Clinic adds granted reminders" on public.reminders;
create policy "Clinic adds granted reminders" on public.reminders
  for insert to authenticated
  with check (
    exists (
      select 1 from public.pet_access_grants g
      where g.pet_id = reminders.pet_id
        and public.is_clinic_member(g.clinic_id)
        and g.revoked_at is null
        and (g.expires_at is null or g.expires_at > timezone('utc', now()))
    )
  );

-- ---------------------------------------------------------------------------
-- Fase 2: agenda simples + prontuário resumido por visita
-- ---------------------------------------------------------------------------
create type public.clinic_appointment_status as enum (
  'scheduled',
  'completed',
  'cancelled',
  'no_show'
);

create table if not exists public.clinic_appointments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  pet_id uuid not null references public.pets (id) on delete cascade,
  tutor_id uuid not null references public.profiles (id) on delete cascade,
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 30 check (duration_minutes > 0),
  status public.clinic_appointment_status not null default 'scheduled',
  reason text,
  visit_notes text,
  return_remind_at timestamptz,
  pet_treatment_id uuid references public.pet_treatments (id) on delete set null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger clinic_appointments_updated_at
  before update on public.clinic_appointments
  for each row
  execute procedure public.set_current_timestamp();

create index if not exists clinic_appointments_clinic_idx on public.clinic_appointments(clinic_id);
create index if not exists clinic_appointments_scheduled_idx on public.clinic_appointments(scheduled_at);
create index if not exists clinic_appointments_pet_idx on public.clinic_appointments(pet_id);

alter table public.clinic_appointments enable row level security;

create policy "Clinic members view appointments" on public.clinic_appointments
  for select to authenticated
  using (public.is_clinic_member(clinic_id));

create policy "Clinic members insert appointments" on public.clinic_appointments
  for insert to authenticated
  with check (
    public.is_clinic_member(clinic_id)
    and created_by = (select auth.uid())
  );

create policy "Clinic members update appointments" on public.clinic_appointments
  for update to authenticated
  using (public.is_clinic_member(clinic_id))
  with check (public.is_clinic_member(clinic_id));

create policy "Clinic members delete appointments" on public.clinic_appointments
  for delete to authenticated
  using (public.is_clinic_member(clinic_id));

create policy "Tutor views own pet appointments" on public.clinic_appointments
  for select to authenticated
  using (tutor_id = (select auth.uid()));

-- Ao concluir visita com return_remind_at, cria lembrete para o tutor
create or replace function public.clinic_appointment_return_reminder()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if new.status = 'completed'
    and new.return_remind_at is not null
    and (old.return_remind_at is distinct from new.return_remind_at or old.status is distinct from new.status)
  then
    insert into public.reminders (pet_id, pet_treatment_id, remind_at, message)
    values (
      new.pet_id,
      new.pet_treatment_id,
      new.return_remind_at,
      coalesce(
        'Retorno agendado pela clínica' || case when new.reason is not null then ': ' || new.reason else '' end,
        'Retorno agendado pela clínica'
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists clinic_appointment_return_reminder on public.clinic_appointments;
create trigger clinic_appointment_return_reminder
  after insert or update of status, return_remind_at on public.clinic_appointments
  for each row
  execute procedure public.clinic_appointment_return_reminder();

grant select, insert, update, delete on public.clinic_appointments to authenticated;
