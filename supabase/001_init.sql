-- Supabase schema for Full-Stack Scheduling Dashboard

create extension if not exists pgcrypto;

create table if not exists public.associates (
  id text primary key,
  name text not null,
  shift_type text not null check (shift_type in ('FHD','BHD','Part Time','Vacation')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.pooling_rules (
  id uuid primary key default gen_random_uuid(),
  associate_id text not null references public.associates(id) on delete cascade,
  sun_wed boolean not null default false,
  wed_sat boolean not null default false,
  part_time boolean not null default false,
  skip boolean not null default false,
  unique(associate_id)
);

create table if not exists public.schedule_days (
  id uuid primary key default gen_random_uuid(),
  schedule_date date not null unique,
  main_associate_id text null references public.associates(id) on delete set null,
  support_associate_id text null references public.associates(id) on delete set null,
  main_category text not null default 'FHD',
  support_category text not null default 'BHD',
  created_at timestamptz not null default now()
);

create table if not exists public.backup_assignments (
  id uuid primary key default gen_random_uuid(),
  schedule_date date not null unique,
  main_associate_id text null references public.associates(id) on delete set null,
  backup_associate_id text null references public.associates(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.associates enable row level security;
alter table public.pooling_rules enable row level security;
alter table public.schedule_days enable row level security;
alter table public.backup_assignments enable row level security;

-- Example permissive policy for authenticated users (tighten per your org rules)
drop policy if exists p_all_associates on public.associates;
create policy p_all_associates on public.associates for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists p_all_pooling on public.pooling_rules;
create policy p_all_pooling on public.pooling_rules for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists p_all_schedule on public.schedule_days;
create policy p_all_schedule on public.schedule_days for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists p_all_backup on public.backup_assignments;
create policy p_all_backup on public.backup_assignments for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
