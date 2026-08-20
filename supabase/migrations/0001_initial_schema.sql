-- ============================================
-- ABSENT - Initial Database Schema
-- Migration: 0001_initial_schema.sql
-- ============================================

-- UUID support
create extension if not exists "pgcrypto";


-- ============================================
-- PROFILES
-- One profile per authenticated user
-- ============================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ============================================
-- SEMESTERS
-- ============================================

create table public.semesters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  start_date date,
  end_date date,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),

  constraint semesters_dates_valid
    check (
      end_date is null
      or start_date is null
      or end_date >= start_date
    )
);

-- A user can have only one active semester
create unique index semesters_one_active_per_user
on public.semesters(user_id)
where is_active = true;


-- ============================================
-- COURSES
-- ============================================

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  semester_id uuid not null references public.semesters(id) on delete cascade,

  name text not null,
  code text not null,
  instructor text,
  max_absences integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint courses_max_absences_valid
    check (max_absences >= 0),

  constraint courses_code_unique_per_semester
    unique (semester_id, code)
);


-- ============================================
-- ABSENCE REASONS
-- Predefined reasons for recording an absence
-- ============================================

create table public.absence_reasons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),

  constraint absence_reasons_name_unique
    unique (user_id, name)
);


-- ============================================
-- ABSENCES
-- IMPORTANT:
-- This application stores ONLY absences.
-- It does NOT store daily attendance/presence.
-- ============================================

create table public.absences (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  reason_id uuid references public.absence_reasons(id) on delete set null,

  date date not null,
  note text,

  created_at timestamptz not null default now(),

  -- Prevent duplicate absence entries
  -- for the same course on the same date.
  constraint absences_course_date_unique
    unique (course_id, date)
);


-- ============================================
-- INDEXES
-- ============================================

create index semesters_user_id_idx
on public.semesters(user_id);

create index courses_user_id_idx
on public.courses(user_id);

create index courses_semester_id_idx
on public.courses(semester_id);

create index absences_user_id_idx
on public.absences(user_id);

create index absences_course_id_idx
on public.absences(course_id);

create index absences_date_idx
on public.absences(date);

create index absence_reasons_user_id_idx
on public.absence_reasons(user_id);


-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger courses_set_updated_at
before update on public.courses
for each row
execute function public.set_updated_at();


-- ============================================
-- CREATE PROFILE WHEN A USER SIGNS UP
-- ============================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    )
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();


-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table public.profiles enable row level security;
alter table public.semesters enable row level security;
alter table public.courses enable row level security;
alter table public.absence_reasons enable row level security;
alter table public.absences enable row level security;


-- ============================================
-- PROFILES POLICIES
-- ============================================

create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());


-- ============================================
-- SEMESTERS POLICIES
-- ============================================

create policy "Users can view their own semesters"
on public.semesters
for select
to authenticated
using (user_id = auth.uid());

create policy "Users can create their own semesters"
on public.semesters
for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can update their own semesters"
on public.semesters
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can delete their own semesters"
on public.semesters
for delete
to authenticated
using (user_id = auth.uid());


-- ============================================
-- COURSES POLICIES
-- ============================================

create policy "Users can view their own courses"
on public.courses
for select
to authenticated
using (user_id = auth.uid());

create policy "Users can create their own courses"
on public.courses
for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can update their own courses"
on public.courses
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can delete their own courses"
on public.courses
for delete
to authenticated
using (user_id = auth.uid());


-- ============================================
-- ABSENCE REASONS POLICIES
-- ============================================

create policy "Users can view their own absence reasons"
on public.absence_reasons
for select
to authenticated
using (user_id = auth.uid());

create policy "Users can create their own absence reasons"
on public.absence_reasons
for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can update their own absence reasons"
on public.absence_reasons
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can delete their own absence reasons"
on public.absence_reasons
for delete
to authenticated
using (user_id = auth.uid());


-- ============================================
-- ABSENCES POLICIES
-- ============================================

create policy "Users can view their own absences"
on public.absences
for select
to authenticated
using (user_id = auth.uid());

create policy "Users can create their own absences"
on public.absences
for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can update their own absences"
on public.absences
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can delete their own absences"
on public.absences
for delete
to authenticated
using (user_id = auth.uid());