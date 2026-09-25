-- ============================================================
-- SaaS DE AGENDAMENTO
-- Migration 001 - Fundação inicial
-- Data: 25/09/2026
-- ============================================================


-- ============================================================
-- 1. ESTABELECIMENTOS
-- Empresa/negócio que utiliza a plataforma
-- ============================================================

create table public.establishments (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  slug text not null unique,

  document text,
  phone text,
  email text,

  timezone text not null default 'America/Sao_Paulo',
  currency text not null default 'BRL',
  locale text not null default 'pt-BR',

  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.establishments
enable row level security;


-- ============================================================
-- 2. MEMBROS DO ESTABELECIMENTO
-- Define quem pode acessar cada estabelecimento
-- ============================================================

create table public.establishment_members (
  id uuid primary key default gen_random_uuid(),

  establishment_id uuid not null
    references public.establishments(id)
    on delete cascade,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  role text not null
    check (role in ('owner', 'manager', 'professional')),

  active boolean not null default true,

  created_at timestamptz not null default now(),

  unique (establishment_id, user_id)
);

alter table public.establishment_members
enable row level security;

create index establishment_members_establishment_id_idx
  on public.establishment_members(establishment_id);

create index establishment_members_user_id_idx
  on public.establishment_members(user_id);


-- ============================================================
-- 3. UNIDADES
-- Um estabelecimento pode possuir uma ou várias unidades
-- ============================================================

create table public.units (
  id uuid primary key default gen_random_uuid(),

  establishment_id uuid not null
    references public.establishments(id)
    on delete cascade,

  name text not null,

  phone text,
  email text,

  address_line text,
  address_number text,
  address_complement text,
  neighborhood text,
  city text,
  state text,
  postal_code text,
  country_code text not null default 'BR',

  timezone text not null default 'America/Sao_Paulo',

  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.units
enable row level security;

create index units_establishment_id_idx
  on public.units(establishment_id);


-- ============================================================
-- 4. PROFISSIONAIS
-- Pessoa que executa serviços e possui agenda
-- Não precisa obrigatoriamente possuir login no sistema
-- ============================================================

create table public.professionals (
  id uuid primary key default gen_random_uuid(),

  establishment_id uuid not null
    references public.establishments(id)
    on delete cascade,

  unit_id uuid not null
    references public.units(id)
    on delete cascade,

  user_id uuid
    references auth.users(id)
    on delete set null,

  name text not null,
  phone text,
  email text,

  bio text,
  avatar_url text,

  accepts_online_booking boolean not null default true,
  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.professionals
enable row level security;

create index professionals_establishment_id_idx
  on public.professionals(establishment_id);

create index professionals_unit_id_idx
  on public.professionals(unit_id);

create index professionals_user_id_idx
  on public.professionals(user_id);