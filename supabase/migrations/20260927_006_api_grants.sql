-- ============================================================
-- Migration 006
-- Permissões da API para usuários autenticados
-- O RLS continua responsável por limitar quais linhas
-- cada usuário pode acessar.
-- ============================================================

-- Estabelecimentos:
-- por enquanto o usuário autenticado precisa apenas consultar.
grant select
on table public.establishments
to authenticated;

-- Membros:
-- consulta necessária para relacionamento e controle de acesso.
grant select
on table public.establishment_members
to authenticated;

-- Tabelas operacionais:
-- leitura e gravação serão controladas pelas policies RLS.
grant select, insert, update
on table
  public.units,
  public.professionals,
  public.services,
  public.professional_services,
  public.professional_working_hours,
  public.professional_availability_exceptions,
  public.customers,
  public.appointments,
  public.appointment_items
to authenticated;
