-- ============================================================
-- SaaS DE AGENDAMENTO
-- Migration 004 - Clientes e agendamentos
-- Data: 25/09/2026
-- ============================================================


-- ============================================================
-- 1. CLIENTES
-- ============================================================

create table public.customers (
  id uuid primary key default gen_random_uuid(),

  establishment_id uuid not null
    references public.establishments(id)
    on delete cascade,

  name text not null,
  phone text,
  email text,
  birth_date date,

  notes text,

  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customers
enable row level security;

create index customers_establishment_idx
  on public.customers(establishment_id);

create index customers_phone_idx
  on public.customers(establishment_id, phone);

create index customers_email_idx
  on public.customers(establishment_id, email);


-- ============================================================
-- 2. AGENDAMENTO
--
-- Representa a visita/reserva completa do cliente.
-- Os serviços individuais ficam em appointment_items.
-- ============================================================

create table public.appointments (
  id uuid primary key default gen_random_uuid(),

  establishment_id uuid not null
    references public.establishments(id)
    on delete cascade,

  unit_id uuid not null
    references public.units(id)
    on delete cascade,

  customer_id uuid not null
    references public.customers(id)
    on delete restrict,

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'pending_approval',
        'confirmed',
        'completed',
        'cancelled',
        'no_show',
        'expired'
      )
    ),

  source text not null default 'online'
    check (
      source in (
        'online',
        'admin',
        'whatsapp',
        'phone',
        'walk_in'
      )
    ),

  total_cents integer not null default 0
    check (total_cents >= 0),

  deposit_required_cents integer not null default 0
    check (deposit_required_cents >= 0),

  deposit_paid_cents integer not null default 0
    check (deposit_paid_cents >= 0),

  payment_status text not null default 'pending'
    check (
      payment_status in (
        'pending',
        'partial',
        'paid',
        'refunded',
        'partially_refunded',
        'waived'
      )
    ),

  notes text,

  cancellation_reason text,

  cancelled_at timestamptz,

  completed_at timestamptz,

  approval_expires_at timestamptz,

  rescheduled_from_id uuid
    references public.appointments(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.appointments
enable row level security;

create index appointments_establishment_idx
  on public.appointments(establishment_id);

create index appointments_unit_idx
  on public.appointments(unit_id);

create index appointments_customer_idx
  on public.appointments(customer_id);

create index appointments_status_idx
  on public.appointments(establishment_id, status);

create index appointments_created_at_idx
  on public.appointments(establishment_id, created_at);

create index appointments_rescheduled_from_idx
  on public.appointments(rescheduled_from_id);


-- ============================================================
-- 3. ITENS DO AGENDAMENTO
--
-- Cada linha representa:
-- serviço + profissional + horário + preço
--
-- Isso permite vários serviços no mesmo agendamento,
-- inclusive simultaneamente com profissionais diferentes.
-- ============================================================

create table public.appointment_items (
  id uuid primary key default gen_random_uuid(),

  establishment_id uuid not null
    references public.establishments(id)
    on delete cascade,

  appointment_id uuid not null
    references public.appointments(id)
    on delete cascade,

  service_id uuid
    references public.services(id)
    on delete set null,

  professional_id uuid not null
    references public.professionals(id)
    on delete restrict,

  starts_at timestamptz not null,

  ends_at timestamptz not null,

  service_name text not null,

  price_cents integer not null default 0
    check (price_cents >= 0),

  duration_minutes integer not null
    check (duration_minutes > 0),

  buffer_minutes integer not null default 0
    check (buffer_minutes >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (ends_at > starts_at)
);

alter table public.appointment_items
enable row level security;

create index appointment_items_establishment_idx
  on public.appointment_items(establishment_id);

create index appointment_items_appointment_idx
  on public.appointment_items(appointment_id);

create index appointment_items_professional_idx
  on public.appointment_items(professional_id);

create index appointment_items_service_idx
  on public.appointment_items(service_id);

create index appointment_items_professional_period_idx
  on public.appointment_items(
    professional_id,
    starts_at,
    ends_at
  );