-- Task status enum
create type public.task_status as enum ('pending', 'completed');

-- Tasks table
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  status public.task_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.tasks enable row level security;

-- RLS policies for per-user access
create policy "Users can view their own tasks" on public.tasks
  for select
  using (auth.uid() = user_id);

create policy "Users can create their own tasks" on public.tasks
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own tasks" on public.tasks
  for update
  using (auth.uid() = user_id);

create policy "Users can delete their own tasks" on public.tasks
  for delete
  using (auth.uid() = user_id);

-- Timestamp update function (shared)
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

-- Trigger for tasks.updated_at
create trigger update_tasks_updated_at
before update on public.tasks
for each row
execute function public.update_updated_at_column();