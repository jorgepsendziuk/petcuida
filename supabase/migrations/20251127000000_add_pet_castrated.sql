-- Add castrated field to pets table
alter table public.pets
  add column if not exists castrated boolean default false not null;
