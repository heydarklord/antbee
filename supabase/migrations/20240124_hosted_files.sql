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

-- Public access policy (for the raw/view endpoints to check validity, though we might bypass RLS in the API with service role if needed, 
-- but for now let's allow public read if not expired logic handled in application or here? 
-- Actually, for the API route we will use a service role client or similar to fetch metadata to check expiry.
-- But if we want to allow direct massive reads, maybe we should allow public select? 
-- Let's keep it private to owner for management, and use a secure function or service role in the Next.js API to serve it.)

-- Create storage bucket for hosted files if it doesn't exist
insert into storage.buckets (id, name, public)
values ('hosted_files', 'hosted_files', true)
on conflict (id) do nothing;

-- Storage policies
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

-- Public access to files (needed for the raw/preview views if we redirect to storage URL)
-- However, we want to control expiry, so maybe we shouldn't allow direct public access to storage?
-- If we proxy the file through our API (which we said we would for 'Raw URL'), we don't need the bucket to be public or have public policies.
-- But the prompt asked for "File Hosting", often implies a direct link. 
-- The user said: "if i pasted something like html... i should have the permission that i want to show the preview or the code".
-- And "Where Expiry Can be...".
-- If we make the bucket public, anyone can guess the URL.
-- So we should keep the bucket private/restricted, and serve files via our Next.js API which checks expiry.
-- So we WILL NOT add a public select policy for storage.objects for everyone.
