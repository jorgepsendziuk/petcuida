-- Add sibling_group_id field to pets table to group siblings without parents
alter table public.pets
  add column if not exists sibling_group_id uuid;

-- Add index for sibling group lookups
create index if not exists pets_sibling_group_id_idx on public.pets(sibling_group_id);
