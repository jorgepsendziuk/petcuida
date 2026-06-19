-- CNPJ da clínica (pessoa jurídica parceira)
alter table public.clinics
  add column if not exists cnpj text;

create unique index if not exists clinics_cnpj_unique_idx
  on public.clinics (cnpj)
  where cnpj is not null;
