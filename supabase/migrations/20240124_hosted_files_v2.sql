-- Drop existing objects to ensure clean slate
drop table if exists hosted_files cascade;
drop function if exists increment_file_views;

-- Create hosted_files table
create table hosted_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  storage_path text not null,
  mime_type text not null,
  size bigint not null,
  expiry_type text not null check (expiry_type in ('1_day', '3_days', '1_week', '1_month', 'never')),
  expires_at timestamp with time zone,
  views bigint default 0,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table hosted_files enable row level security;

-- Policies for hosted_files
create policy "Users can view their own hosted files"
  on hosted_files for select
  using (auth.uid() = user_id);

create policy "Users can insert their own hosted files"
  on hosted_files for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own hosted files"
  on hosted_files for update
  using (auth.uid() = user_id);

create policy "Users can delete their own hosted files"
  on hosted_files for delete
  using (auth.uid() = user_id);

-- Create storage bucket for hosted files if it doesn't exist
insert into storage.buckets (id, name, public)
values ('hosted_files', 'hosted_files', true)
on conflict (id) do nothing;

-- Storage policies
-- Note: We need to drop existing policies first to potentially avoid conflicts or duplication errors if they exist differently
-- But simpler to just use 'create policy if not exists' logic or distinct names. 
-- For now, standard create.

create policy "Users can upload their own files"
on storage.objects for insert
with check ( bucket_id = 'hosted_files' and auth.uid() = owner );

create policy "Users can update their own files"
on storage.objects for update
using ( bucket_id = 'hosted_files' and auth.uid() = owner );

create policy "Users can delete their own files"
on storage.objects for delete
using ( bucket_id = 'hosted_files' and auth.uid() = owner );

create policy "Users can view their own files"
on storage.objects for select
using ( bucket_id = 'hosted_files' and auth.uid() = owner );
