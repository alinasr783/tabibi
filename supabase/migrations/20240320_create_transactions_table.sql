-- Create transactions table for EasyKash payments
-- Drop type if exists to avoid errors on rerun
drop type if exists payment_status cascade;
drop type if exists payment_type cascade;

create type payment_status as enum ('pending', 'completed', 'failed', 'refunded');
create type payment_type as enum ('subscription', 'wallet', 'app_purchase');

create table if not exists public.transactions (
    id uuid default gen_random_uuid() primary key,
    reference_number serial, -- Numeric reference for EasyKash
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    user_id uuid references auth.users(id) on delete set null,
    clinic_id uuid references public.clinics(id) on delete set null,
    
    -- EasyKash specific fields
    easykash_ref text,
    amount decimal(10, 2) not null,
    currency text default 'EGP',
    status payment_status default 'pending',
    type payment_type not null,
    
    -- Metadata to store context (e.g. which plan, which app)
    metadata jsonb default '{}'::jsonb,
    
    -- Response data from EasyKash for audit
    response_data jsonb default '{}'::jsonb
);

-- Add index for reference_number
create index if not exists idx_transactions_reference_number on public.transactions(reference_number);

-- Add RLS policies
alter table public.transactions enable row level security;

create policy "Users can view their own transactions"
    on public.transactions for select
    using (auth.uid() = user_id);

create policy "Service role can manage all transactions"
    on public.transactions for all
    using (auth.role() = 'service_role');

-- Create function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists handle_transactions_updated_at on public.transactions;
create trigger handle_transactions_updated_at
    before update on public.transactions
    for each row
    execute procedure public.handle_updated_at();
