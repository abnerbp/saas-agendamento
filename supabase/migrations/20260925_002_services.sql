-- ============================================================
-- SaaS DE AGENDAMENTO
-- Migration 002 - Serviços e profissionais
-- Data: 25/09/2026
-- ============================================================


-- ============================================================
-- 1. SERVIÇOS
-- Catálogo próprio de cada estabelecimento
-- ============================================================

create table public.services (
  id uuid primary key default gen_random_uuid(),

  establishment_id uuid not null
    references public.establishments(id)
    on delete cascade,

  name text not null,

  description text,

  category text,

  -- Valores monetários em centavos.
  -- Ex.: R$ 50,00 = 5000
  price_cents integer not null default 0
    check (price_cents >= 0),

  -- Duração padrão do serviço em minutos
  duration_minutes integer not null
    check (duration_minutes > 0),

  -- Intervalo opcional depois do atendimento
  buffer_minutes integer not null default 0
    check (buffer_minutes >= 0),

  -- Pode aparecer para o cliente na agenda online?
  online_booking_enabled boolean not null default true,

  -- Alguns serviços podem precisar de aprovação do profissional
  requires_approval boolean not null default false,

  -- Serviço continua sendo oferecido?
  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.services
enable row level security;

create index services_establishment_id_idx
  on public.services(establishment_id);

create index services_active_idx
  on public.services(establishment_id, active);


-- ============================================================
-- 2. PROFISSIONAIS X SERVIÇOS
--
-- Um profissional pode executar vários serviços.
-- Um serviço pode ser executado por vários profissionais.
-- ============================================================

create table public.professional_services (
  id uuid primary key default gen_random_uuid(),

  establishment_id uuid not null
    references public.establishments(id)
    on delete cascade,

  professional_id uuid not null
    references public.professionals(id)
    on delete cascade,

  service_id uuid not null
    references public.services(id)
    on delete cascade,

  active boolean not null default true,

  created_at timestamptz not null default now(),

  unique (professional_id, service_id)
);

alter table public.professional_services
enable row level security;

create index professional_services_establishment_id_idx
  on public.professional_services(establishment_id);

create index professional_services_professional_id_idx
  on public.professional_services(professional_id);

create index professional_services_service_id_idx
  on public.professional_services(service_id);