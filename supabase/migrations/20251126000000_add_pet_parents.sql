-- Add parent fields to pets table for genealogy tree
alter table public.pets
  add column if not exists mother_id uuid references public.pets (id) on delete set null,
  add column if not exists father_id uuid references public.pets (id) on delete set null,
  add column if not exists photo_url text;

-- Add indexes for parent lookups
create index if not exists pets_mother_id_idx on public.pets(mother_id);
create index if not exists pets_father_id_idx on public.pets(father_id);

-- Add check to prevent circular references (pet cannot be its own parent)
alter table public.pets
  add constraint pets_no_self_parent check (id != mother_id and id != father_id);
