-- Admin da plataforma + suporte a personificação de visão (UI)

alter table public.profiles
  add column if not exists is_platform_admin boolean not null default false;

create index if not exists profiles_platform_admin_idx
  on public.profiles (is_platform_admin)
  where is_platform_admin = true;

comment on column public.profiles.is_platform_admin is
  'Admin PetCuida: pode alternar visão Cuidador/Parceiro na UI. Não bypassa RLS.';
