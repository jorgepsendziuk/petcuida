-- Tabela para receitas médicas veterinárias
create table if not exists public.pet_prescriptions (
    id uuid primary key default gen_random_uuid(),
    pet_id uuid not null references public.pets (id) on delete cascade,
    owner_id uuid not null references public.profiles (id) on delete cascade,
    prescription_date date not null default current_date,
    veterinarian_name text,
    veterinarian_crmv text,
    clinic_name text,
    image_url text, -- URL da imagem da receita (base64 ou storage)
    notes text, -- Observações gerais da receita
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create trigger pet_prescriptions_updated_at
    before update on public.pet_prescriptions
    for each row
    execute procedure public.set_current_timestamp();

create index if not exists pet_prescriptions_pet_idx on public.pet_prescriptions(pet_id);
create index if not exists pet_prescriptions_owner_idx on public.pet_prescriptions(owner_id);
create index if not exists pet_prescriptions_date_idx on public.pet_prescriptions(prescription_date);

-- Tabela para medicamentos de cada receita
create table if not exists public.prescription_medications (
    id uuid primary key default gen_random_uuid(),
    prescription_id uuid not null references public.pet_prescriptions (id) on delete cascade,
    medication_name text not null,
    dosage text, -- Ex: "50mg", "1 comprimido", "2ml"
    frequency text, -- Ex: "2x ao dia", "A cada 8 horas", "1x por semana"
    duration_days integer check (duration_days is null or duration_days > 0),
    start_date date,
    end_date date,
    route text, -- Ex: "Oral", "Tópico", "Injetável"
    instructions text, -- Instruções adicionais
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create trigger prescription_medications_updated_at
    before update on public.prescription_medications
    for each row
    execute procedure public.set_current_timestamp();

create index if not exists prescription_medications_prescription_idx on public.prescription_medications(prescription_id);
