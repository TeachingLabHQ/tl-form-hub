-- Create vendor_payment_email_logs table
create table if not exists public.vendor_payment_email_logs (
  id bigint primary key generated always as identity,
  submission_id bigint references public.vendor_payment_submissions(id) on delete cascade,
  month date not null,
  sent_at timestamp with time zone,
  status text not null,
  error_message text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create index for faster lookups
create index if not exists idx_vendor_payment_email_logs_submission_id 
  on public.vendor_payment_email_logs(submission_id);

create index if not exists idx_vendor_payment_email_logs_month 
  on public.vendor_payment_email_logs(month);

-- Add RLS policies
alter table public.vendor_payment_email_logs enable row level security;

-- Allow service role to access all records
create policy "Service role can access all email logs"
  on public.vendor_payment_email_logs
  for all
  to service_role
  using (true)
  with check (true);

  -- Allow authenticated users to read their own email logs
create policy "Users can read their own email logs"
  on public.vendor_payment_email_logs
  for select
  to authenticated
  using (
    exists (
      select 1 from public.vendor_payment_submissions
      where id = submission_id
      and cf_email = auth.jwt() ->> 'email'
    )
  );

-- Create function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger for updated_at
create trigger set_updated_at
  before update on public.vendor_payment_email_logs
  for each row
  execute function public.handle_updated_at();
