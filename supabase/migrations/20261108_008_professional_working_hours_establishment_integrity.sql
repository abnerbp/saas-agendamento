-- Ensure working hours reference a professional from the same establishment.

alter table public.professionals
  add constraint professionals_establishment_id_id_key
  unique (establishment_id, id);

alter table public.professional_working_hours
  add constraint professional_working_hours_establishment_professional_fkey
  foreign key (establishment_id, professional_id)
  references public.professionals (establishment_id, id)
  on delete cascade;

alter table public.professional_working_hours
  drop constraint professional_working_hours_professional_id_fkey;
