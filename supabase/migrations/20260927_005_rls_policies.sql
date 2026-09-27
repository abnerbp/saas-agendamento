-- ============================================================
-- SaaS DE AGENDAMENTO
-- Migration 005 - Políticas de segurança (RLS)
-- Data: 27/09/2026
-- ============================================================


-- ============================================================
-- 1. FUNÇÃO AUXILIAR
--
-- Verifica se o usuário autenticado pertence ao estabelecimento.
-- Será utilizada pelas políticas RLS das demais tabelas.
-- ============================================================

create or replace function public.is_establishment_member(
  target_establishment_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.establishment_members em
    where em.establishment_id = target_establishment_id
      and em.user_id = auth.uid()
      and em.active = true
  );
$$;
-- ============================================================
-- 2. ESTABELECIMENTOS
--
-- Usuários autenticados só podem visualizar estabelecimentos
-- dos quais fazem parte.
-- ============================================================

create policy "members_can_view_establishment"
on public.establishments
for select
to authenticated
using (
  public.is_establishment_member(id)
);


-- ============================================================
-- 3. MEMBROS DO ESTABELECIMENTO
--
-- Um usuário autenticado pode visualizar os membros
-- dos estabelecimentos dos quais ele faz parte.
-- ============================================================

create policy "members_can_view_establishment_members"
on public.establishment_members
for select
to authenticated
using (
  public.is_establishment_member(establishment_id)
);
-- ============================================================
-- 4. UNIDADES
-- ============================================================

create policy "members_can_view_units"
on public.units
for select
to authenticated
using (
  public.is_establishment_member(establishment_id)
);


-- ============================================================
-- 5. PROFISSIONAIS
-- ============================================================

create policy "members_can_view_professionals"
on public.professionals
for select
to authenticated
using (
  public.is_establishment_member(establishment_id)
);


-- ============================================================
-- 6. SERVIÇOS
-- ============================================================

create policy "members_can_view_services"
on public.services
for select
to authenticated
using (
  public.is_establishment_member(establishment_id)
);


-- ============================================================
-- 7. SERVIÇOS DOS PROFISSIONAIS
-- ============================================================

create policy "members_can_view_professional_services"
on public.professional_services
for select
to authenticated
using (
  public.is_establishment_member(establishment_id)
);
-- ============================================================
-- 8. HORÁRIOS DE TRABALHO DOS PROFISSIONAIS
-- ============================================================

create policy "members_can_view_working_hours"
on public.professional_working_hours
for select
to authenticated
using (
  public.is_establishment_member(establishment_id)
);


-- ============================================================
-- 9. EXCEÇÕES DE DISPONIBILIDADE
-- ============================================================

create policy "members_can_view_availability_exceptions"
on public.professional_availability_exceptions
for select
to authenticated
using (
  public.is_establishment_member(establishment_id)
);


-- ============================================================
-- 10. CLIENTES
-- ============================================================

create policy "members_can_view_customers"
on public.customers
for select
to authenticated
using (
  public.is_establishment_member(establishment_id)
);


-- ============================================================
-- 11. AGENDAMENTOS
-- ============================================================

create policy "members_can_view_appointments"
on public.appointments
for select
to authenticated
using (
  public.is_establishment_member(establishment_id)
);


-- ============================================================
-- 12. ITENS DOS AGENDAMENTOS
-- ============================================================

create policy "members_can_view_appointment_items"
on public.appointment_items
for select
to authenticated
using (
  public.is_establishment_member(establishment_id)
);
-- ============================================================
-- 13. FUNÇÃO AUXILIAR PARA ADMINISTRAÇÃO
--
-- Verifica se o usuário autenticado é proprietário
-- ou gerente ativo do estabelecimento.
-- ============================================================

create or replace function public.is_establishment_admin(
  target_establishment_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.establishment_members em
    where em.establishment_id = target_establishment_id
      and em.user_id = auth.uid()
      and em.active = true
      and em.role in ('owner', 'manager')
  );
$$;
-- ============================================================
-- 14. ESCRITA ADMINISTRATIVA
--
-- Owner e Manager podem cadastrar e alterar
-- os principais dados operacionais do estabelecimento.
-- ============================================================


-- UNIDADES

create policy "admins_can_insert_units"
on public.units
for insert
to authenticated
with check (
  public.is_establishment_admin(establishment_id)
);

create policy "admins_can_update_units"
on public.units
for update
to authenticated
using (
  public.is_establishment_admin(establishment_id)
)
with check (
  public.is_establishment_admin(establishment_id)
);


-- PROFISSIONAIS

create policy "admins_can_insert_professionals"
on public.professionals
for insert
to authenticated
with check (
  public.is_establishment_admin(establishment_id)
);

create policy "admins_can_update_professionals"
on public.professionals
for update
to authenticated
using (
  public.is_establishment_admin(establishment_id)
)
with check (
  public.is_establishment_admin(establishment_id)
);


-- SERVIÇOS

create policy "admins_can_insert_services"
on public.services
for insert
to authenticated
with check (
  public.is_establishment_admin(establishment_id)
);

create policy "admins_can_update_services"
on public.services
for update
to authenticated
using (
  public.is_establishment_admin(establishment_id)
)
with check (
  public.is_establishment_admin(establishment_id)
);


-- SERVIÇOS VINCULADOS AOS PROFISSIONAIS

create policy "admins_can_insert_professional_services"
on public.professional_services
for insert
to authenticated
with check (
  public.is_establishment_admin(establishment_id)
);

create policy "admins_can_update_professional_services"
on public.professional_services
for update
to authenticated
using (
  public.is_establishment_admin(establishment_id)
)
with check (
  public.is_establishment_admin(establishment_id)
);


-- HORÁRIOS DE TRABALHO

create policy "admins_can_insert_working_hours"
on public.professional_working_hours
for insert
to authenticated
with check (
  public.is_establishment_admin(establishment_id)
);

create policy "admins_can_update_working_hours"
on public.professional_working_hours
for update
to authenticated
using (
  public.is_establishment_admin(establishment_id)
)
with check (
  public.is_establishment_admin(establishment_id)
);


-- EXCEÇÕES / BLOQUEIOS DA AGENDA

create policy "admins_can_insert_availability_exceptions"
on public.professional_availability_exceptions
for insert
to authenticated
with check (
  public.is_establishment_admin(establishment_id)
);

create policy "admins_can_update_availability_exceptions"
on public.professional_availability_exceptions
for update
to authenticated
using (
  public.is_establishment_admin(establishment_id)
)
with check (
  public.is_establishment_admin(establishment_id)
);


-- CLIENTES

create policy "admins_can_insert_customers"
on public.customers
for insert
to authenticated
with check (
  public.is_establishment_admin(establishment_id)
);

create policy "admins_can_update_customers"
on public.customers
for update
to authenticated
using (
  public.is_establishment_admin(establishment_id)
)
with check (
  public.is_establishment_admin(establishment_id)
);


-- AGENDAMENTOS

create policy "admins_can_insert_appointments"
on public.appointments
for insert
to authenticated
with check (
  public.is_establishment_admin(establishment_id)
);

create policy "admins_can_update_appointments"
on public.appointments
for update
to authenticated
using (
  public.is_establishment_admin(establishment_id)
)
with check (
  public.is_establishment_admin(establishment_id)
);


-- ITENS DOS AGENDAMENTOS

create policy "admins_can_insert_appointment_items"
on public.appointment_items
for insert
to authenticated
with check (
  public.is_establishment_admin(establishment_id)
);

create policy "admins_can_update_appointment_items"
on public.appointment_items
for update
to authenticated
using (
  public.is_establishment_admin(establishment_id)
)
with check (
  public.is_establishment_admin(establishment_id)
);