-- Ensure a professional can only reference a unit from the same establishment.

alter table public.units
  add constraint units_establishment_id_id_key
  unique (establishment_id, id);

alter table public.professionals
  add constraint professionals_establishment_unit_fkey
  foreign key (establishment_id, unit_id)
  references public.units (establishment_id, id)
  on delete cascade;

alter table public.professionals
  drop constraint professionals_unit_id_fkey;
