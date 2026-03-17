-- ============================================================
-- Dominion — Supabase Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── Users / Email Connections ───────────────────────────────────────────────
-- Note: auth.users is managed by Supabase Auth automatically.
-- We extend it with a profiles table.

create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  name text,
  company text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, company)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'company', '')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Email Connections ───────────────────────────────────────────────────────
create table if not exists public.email_connections (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  provider text not null check (provider in ('gmail', 'outlook')),
  email text not null,
  connected_at timestamptz default now(),
  status text not null default 'active' check (status in ('active', 'error')),
  unique(user_id, provider)
);

alter table public.email_connections enable row level security;
create policy "Users can manage own email connections" on public.email_connections
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Invoices ────────────────────────────────────────────────────────────────
create table if not exists public.invoices (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  invoice_number text,
  vendor_name text not null,
  amount numeric(12,2) not null default 0,
  currency text default 'USD',
  due_date text,
  invoice_date text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'paid', 'flagged', 'overdue')),
  category text,
  description text,
  line_items jsonb default '[]',
  anomalies jsonb default '[]',
  source text default 'manual' check (source in ('gmail', 'outlook', 'manual', 'upload')),
  source_email_id text,
  pdf_url text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.invoices enable row level security;
create policy "Users can manage own invoices" on public.invoices
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists invoices_user_id_idx on public.invoices(user_id);
create index if not exists invoices_status_idx on public.invoices(status);

-- ─── Vendors ─────────────────────────────────────────────────────────────────
create table if not exists public.vendors (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  category text,
  contact_name text,
  contact_email text,
  contact_phone text,
  address text,
  payment_terms text,
  notes text,
  created_at timestamptz default now(),
  unique(user_id, name)
);

alter table public.vendors enable row level security;
create policy "Users can manage own vendors" on public.vendors
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Contracts ───────────────────────────────────────────────────────────────
create table if not exists public.contracts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  vendor_name text not null,
  contract_type text,
  description text,
  start_date text,
  end_date text,
  auto_renews boolean default false,
  renewal_notice_days integer default 30,
  total_contract_value numeric(12,2),
  billing_frequency text,
  line_items jsonb default '[]',
  linked_invoice_ids jsonb default '[]',
  year_over_year jsonb default '[]',
  requires_service_verification boolean default false,
  service_verification_type text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.contracts enable row level security;
create policy "Users can manage own contracts" on public.contracts
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Insurance Policies ──────────────────────────────────────────────────────
create table if not exists public.insurance_policies (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  carrier text not null,
  policy_number text,
  policy_type text,
  premium numeric(12,2),
  billing_frequency text,
  effective_date text,
  expiration_date text,
  coverage_items jsonb default '[]',
  status text default 'active',
  ai_summary text,
  gaps_detected jsonb default '[]',
  year_over_year_premiums jsonb default '[]',
  alternative_quotes jsonb default '[]',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.insurance_policies enable row level security;
create policy "Users can manage own policies" on public.insurance_policies
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Payments ────────────────────────────────────────────────────────────────
create table if not exists public.payments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  vendor_name text not null,
  invoice_id uuid references public.invoices(id) on delete set null,
  invoice_number text,
  amount numeric(12,2) not null,
  due_date text,
  payment_method text,
  bank_account text,
  routing_number text,
  status text default 'pending_approval',
  quickbooks_status text default 'not_connected',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.payments enable row level security;
create policy "Users can manage own payments" on public.payments
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Inbox Alerts ────────────────────────────────────────────────────────────
create table if not exists public.inbox_alerts (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  priority text not null,
  title text not null,
  subtitle text,
  amount numeric(12,2),
  action_label text,
  secondary_action_label text,
  dismissed boolean default false,
  invoice_id uuid references public.invoices(id) on delete cascade,
  created_at timestamptz default now()
);

alter table public.inbox_alerts enable row level security;
create policy "Users can manage own alerts" on public.inbox_alerts
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Scan History ────────────────────────────────────────────────────────────
create table if not exists public.scan_history (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  provider text not null check (provider in ('gmail', 'outlook')),
  scanned_count integer default 0,
  extracted_count integer default 0,
  errors jsonb default '[]',
  scanned_at timestamptz default now()
);

alter table public.scan_history enable row level security;
create policy "Users can view own scan history" on public.scan_history
  using (auth.uid() = user_id);

-- ─── Delivery Orders ─────────────────────────────────────────────────────────
create table if not exists public.delivery_orders (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  bol_number text,
  status text default 'new',
  source text default 'manual',
  raw_email_subject text,
  received_date text,
  extraction_confidence numeric(4,2),
  shipper jsonb,
  consignee jsonb,
  third_party_bill_to jsonb,
  pickup_ready text,
  pickup_close text,
  projected_delivery text,
  cargo_items jsonb default '[]',
  total_pieces integer,
  total_weight_lbs numeric(10,2),
  quoted_rate numeric(12,2),
  currency text default 'USD',
  carrier_quote_ref text,
  billing_portal text,
  "references" jsonb default '[]',
  carrier_contact jsonb,
  anomalies jsonb default '[]',
  missing_fields jsonb default '[]',
  auto_response_sent boolean default false,
  ai_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.delivery_orders enable row level security;
create policy "Users can manage own orders" on public.delivery_orders
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Updated_at trigger ──────────────────────────────────────────────────────
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger invoices_updated_at before update on public.invoices
  for each row execute procedure public.update_updated_at();
create trigger contracts_updated_at before update on public.contracts
  for each row execute procedure public.update_updated_at();
create trigger insurance_policies_updated_at before update on public.insurance_policies
  for each row execute procedure public.update_updated_at();
create trigger payments_updated_at before update on public.payments
  for each row execute procedure public.update_updated_at();
create trigger delivery_orders_updated_at before update on public.delivery_orders
  for each row execute procedure public.update_updated_at();
