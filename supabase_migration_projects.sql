-- =============================================
-- Migration: Add multi-project support
-- Run this in: Supabase Dashboard > SQL Editor
-- =============================================

-- 1. Create projects table
create table projects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  color text default '#6366f1',
  created_at timestamptz default now()
);

-- 2. Enable RLS on projects
alter table projects enable row level security;

create policy "Users can view their own projects"
  on projects for select
  using (auth.uid() = user_id);

create policy "Users can insert their own projects"
  on projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own projects"
  on projects for update
  using (auth.uid() = user_id);

create policy "Users can delete their own projects"
  on projects for delete
  using (auth.uid() = user_id);

-- 3. Add project_id column to flashcards (nullable for now)
alter table flashcards add column project_id uuid references projects(id) on delete cascade;

-- 4. Create a default "General" project for each user that has flashcards,
--    then assign all their existing cards to it.
do $$
declare
  r record;
  new_project_id uuid;
begin
  for r in (select distinct user_id from flashcards) loop
    insert into projects (user_id, name, color)
    values (r.user_id, 'General', '#6366f1')
    returning id into new_project_id;

    update flashcards
    set project_id = new_project_id
    where user_id = r.user_id and project_id is null;
  end loop;
end $$;

-- 5. Make project_id NOT NULL now that all existing rows have a value
alter table flashcards alter column project_id set not null;
