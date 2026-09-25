-- ============================================================
-- SaaS DE AGENDAMENTO
-- Migration 003 - Horários e disponibilidade
-- Data: 25/09/2026
-- ============================================================


-- ============================================================
-- 1. JORNADA SEMANAL DO PROFISSIONAL
--
-- Define o horário normal de trabalho.
-- weekday:
-- 0 = domingo
-- 1 = segunda
-- ...
-- 6 = sábado
--
-- Um profissional pode possuir mais de um período no mesmo dia.
-- Exemplo:
-- 08:00 às 12:00
-- 13:00 às 18:00
-- ============================================================

create table public.professional_working_hours (
  id uuid primary key default gen_random_uuid(),

  establishment_id uuid not null
    references public.establishments(id)
    on delete cascade,

  professional_id uuid not null
    references public.professionals(id)
    on delete cascade,

  weekday smallint not null
    check (weekday between 0 and 6),

  start_time time not null,
  end_time time not null,

  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (end_time > start_time),

  unique (
    professional_id,
    weekday,
    start_time,
    end_time
  )
);

alter table public.professional_working_hours
enable row level security;

create index professional_working_hours_establishment_idx
  on public.professional_working_hours(establishment_id);

create index professional_working_hours_professional_idx
  on public.professional_working_hours(professional_id);

create index professional_working_hours_weekday_idx
  on public.professional_working_hours(professional_id, weekday);


-- ============================================================
-- 2. EXCEÇÕES / BLOQUEIOS DA AGENDA
--
-- Permite:
-- folga
-- almoço excepcional
-- compromisso pessoal
-- férias
-- ausência
-- horário especial
-- bloqueio administrativo
--
-- "blocked" = profissional NÃO está disponível
-- "available" = abre disponibilidade excepcional
-- ============================================================

create table public.professional_availability_exceptions (
  id uuid primary key default gen_random_uuid(),

  establishment_id uuid not null
    references public.establishments(id)
    on delete cascade,

  professional_id uuid not null
    references public.professionals(id)
    on delete cascade,

  starts_at timestamptz not null,
  ends_at timestamptz not null,

  exception_type text not null
    check (exception_type in ('blocked', 'available')),

  reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (ends_at > starts_at)
);

alter table public.professional_availability_exceptions
enable row level security;

create index professional_availability_exceptions_establishment_idx
  on public.professional_availability_exceptions(establishment_id);

create index professional_availability_exceptions_professional_idx
  on public.professional_availability_exceptions(professional_id);

create index professional_availability_exceptions_period_idx
  on public.professional_availability_exceptions(
    professional_id,
    starts_at,
    ends_at
  );