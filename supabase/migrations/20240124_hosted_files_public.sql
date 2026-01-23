-- Enable Public Read Access for hosted_files table
create policy "Public can view hosted files"
  on hosted_files for select
  using (true);

-- Enable Public Download Access for hosted_files storage bucket
create policy "Public can view files"
  on storage.objects for select
  using ( bucket_id = 'hosted_files' );
