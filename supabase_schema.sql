-- Drop old table if migrating from SM-2
-- drop table if exists flashcards;

-- Create a table for flashcards (FSRS v6 schema)
create table flashcards (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  question text not null,
  answer text not null,

  -- FSRS Card fields
  due timestamptz default now(),
  stability float default 0,
  difficulty float default 0,
  elapsed_days integer default 0,
  scheduled_days integer default 0,
  reps integer default 0,
  lapses integer default 0,
  state integer default 0,
  last_review timestamptz,

  created_at timestamptz default now()
);

-- Enable Row Level Security (RLS)
alter table flashcards enable row level security;

-- Create a policy that allows users to select only their own cards
create policy "Users can view their own cards"
  on flashcards for select
  using (auth.uid() = user_id);

-- Create a policy that allows users to insert their own cards
create policy "Users can insert their own cards"
  on flashcards for insert
  with check (auth.uid() = user_id);

-- Create a policy that allows users to update their own cards
create policy "Users can update their own cards"
  on flashcards for update
  using (auth.uid() = user_id);

-- Create a policy that allows users to delete their own cards
create policy "Users can delete their own cards"
  on flashcards for delete
  using (auth.uid() = user_id);
