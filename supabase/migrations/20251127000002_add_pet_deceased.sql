-- Add deceased fields to pets table
alter table public.pets
  add column if not exists deceased boolean default false not null,
  add column if not exists death_date date;
