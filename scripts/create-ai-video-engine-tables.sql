-- AI Video Engine persistence tables
-- Run once against the InsForge/Postgres project used by Soluciones Fabrick.

create table if not exists public.ai_video_engine_runs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  input_data jsonb not null default '{}'::jsonb,
  generated_data jsonb not null default '{}'::jsonb,
  status text not null default 'generated',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_video_scene_assets (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.ai_video_engine_runs(id) on delete cascade,
  scene_id integer not null,
  asset_type text not null default 'image',
  asset_url text not null,
  cloudinary_public_id text,
  created_at timestamptz not null default now()
);

create index if not exists ai_video_engine_runs_created_at_idx
  on public.ai_video_engine_runs(created_at desc);

create index if not exists ai_video_scene_assets_run_id_idx
  on public.ai_video_scene_assets(run_id);

alter table public.ai_video_engine_runs enable row level security;
alter table public.ai_video_scene_assets enable row level security;
