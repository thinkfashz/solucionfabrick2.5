-- Admin demo access, audit, feedback and profile tables
-- Run once against the InsForge/Postgres project used by Soluciones Fabrick.
-- Idempotent: safe to run more than once.

create extension if not exists pgcrypto;

create table if not exists public.demo_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  label text,
  created_by text,
  expira_at timestamptz not null,
  accesos integer not null default 0,
  ultimo_acceso timestamptz,
  locked_ip text,
  locked_at timestamptz,
  ultimo_ip text,
  ultimo_user_agent text,
  ultimo_dispositivo text,
  created_at timestamptz not null default now()
);

alter table public.demo_tokens add column if not exists locked_ip text;
alter table public.demo_tokens add column if not exists locked_at timestamptz;
alter table public.demo_tokens add column if not exists ultimo_ip text;
alter table public.demo_tokens add column if not exists ultimo_user_agent text;
alter table public.demo_tokens add column if not exists ultimo_dispositivo text;

create index if not exists demo_tokens_expira_at_idx on public.demo_tokens(expira_at desc);
create index if not exists demo_tokens_created_by_idx on public.demo_tokens(created_by);
create index if not exists demo_tokens_locked_ip_idx on public.demo_tokens(locked_ip);

create table if not exists public.demo_access_audit (
  id uuid primary key default gen_random_uuid(),
  demo_token_id uuid references public.demo_tokens(id) on delete set null,
  token text,
  session_id text,
  ip text,
  user_agent text,
  device text,
  outcome text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists demo_access_audit_created_at_idx on public.demo_access_audit(created_at desc);
create index if not exists demo_access_audit_session_id_idx on public.demo_access_audit(session_id);
create index if not exists demo_access_audit_ip_idx on public.demo_access_audit(ip);

create table if not exists public.demo_session_events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  page text,
  entered_at timestamptz not null default now(),
  left_at timestamptz,
  duration_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists demo_session_events_entered_at_idx on public.demo_session_events(entered_at desc);
create index if not exists demo_session_events_session_id_idx on public.demo_session_events(session_id);

create table if not exists public.demo_feedback (
  id uuid primary key default gen_random_uuid(),
  session_id text,
  email text,
  message text not null,
  rating integer,
  page text,
  ip text,
  user_agent text,
  device text,
  created_at timestamptz not null default now()
);

create index if not exists demo_feedback_created_at_idx on public.demo_feedback(created_at desc);
create index if not exists demo_feedback_session_id_idx on public.demo_feedback(session_id);

create table if not exists public.admin_profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text,
  phone text,
  bio text,
  avatar_url text,
  avatar_public_id text,
  instagram text,
  facebook text,
  linkedin text,
  whatsapp text,
  website text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_profiles_email_idx on public.admin_profiles(email);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_admin_profiles_updated_at on public.admin_profiles;
create trigger set_admin_profiles_updated_at
before update on public.admin_profiles
for each row
execute function public.set_updated_at();

alter table public.demo_tokens enable row level security;
alter table public.demo_access_audit enable row level security;
alter table public.demo_session_events enable row level security;
alter table public.demo_feedback enable row level security;
alter table public.admin_profiles enable row level security;
