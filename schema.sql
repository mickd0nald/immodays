-- =====================================================================
-- immodays · Supabase schema
-- =====================================================================
-- 1. Open Supabase Dashboard → SQL Editor → "New query"
-- 2. Paste this entire file and press "Run"
-- 3. Wait for "Success. No rows returned"
-- 4. Then create the storage bucket as described in SUPABASE_SETUP.md
-- =====================================================================

-- ---------------------------------------------------------------------
-- ENUMs
-- ---------------------------------------------------------------------
do $$ begin
  create type account_type as enum ('private', 'business', 'agent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type listing_type as enum ('rent', 'buy');
exception when duplicate_object then null; end $$;

do $$ begin
  create type property_type as enum ('apartment', 'house', 'land', 'commercial', 'room');
exception when duplicate_object then null; end $$;

do $$ begin
  create type country_code as enum ('DE', 'AT', 'CH', 'ES');
exception when duplicate_object then null; end $$;

do $$ begin
  create type address_visibility as enum ('public', 'on_request', 'hidden');
exception when duplicate_object then null; end $$;

do $$ begin
  create type listing_status as enum ('draft', 'active', 'paused', 'rented', 'sold', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type listing_source as enum ('immodays', 'immoscout24', 'immowelt', 'kleinanzeigen', 'other');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text,
  display_name    text,
  account_type    account_type not null default 'private',
  company_name    text,
  phone           text,
  website         text,
  avatar_url      text,
  marketing_consent boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles are readable by everyone" on public.profiles;
create policy "profiles are readable by everyone"
  on public.profiles for select
  using (true);

drop policy if exists "users can insert their own profile" on public.profiles;
create policy "users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "users can update their own profile" on public.profiles;
create policy "users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, account_type, company_name, marketing_consent)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data ->> 'account_type')::account_type, 'private'),
    new.raw_user_meta_data ->> 'company_name',
    coalesce((new.raw_user_meta_data ->> 'marketing_consent')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- properties
-- ---------------------------------------------------------------------
create table if not exists public.properties (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) on delete cascade,

  -- Basics
  title               text not null,
  description         text,
  listing_type        listing_type not null,
  property_type       property_type not null,

  -- Location
  country             country_code not null,
  postal_code         text,
  city                text not null,
  district            text,
  street              text,
  lat                 double precision,
  lng                 double precision,
  address_visibility  address_visibility not null default 'on_request',

  -- Layout
  rooms               numeric(4,1),
  bedrooms            int,
  bathrooms           int,
  living_area         numeric(8,2),       -- m²
  plot_area           numeric(10,2),      -- m²
  floor               int,
  total_floors        int,
  year_built          int,

  -- Price
  price               numeric(12,2) not null,
  currency            text not null default 'EUR',
  price_type          text,               -- e.g. 'monthly', 'total', 'per_m2'
  additional_costs    numeric(12,2),
  heating_costs       numeric(12,2),
  deposit             numeric(12,2),
  commission          text,

  -- Equipment / energy
  features            jsonb not null default '[]'::jsonb,
  energy_certificate  text,
  energy_class        text,
  energy_value        numeric(8,2),
  energy_carrier      text,

  -- Media
  images              jsonb not null default '[]'::jsonb,
  floor_plan_url      text,
  virtual_tour_url    text,

  -- Meta
  status              listing_status not null default 'draft',
  is_business         boolean not null default false,
  source              listing_source not null default 'immodays',
  source_url          text,
  views_count         int not null default 0,
  expires_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists properties_status_idx       on public.properties (status);
create index if not exists properties_country_city_idx on public.properties (country, city);
create index if not exists properties_listing_type_idx on public.properties (listing_type);
create index if not exists properties_property_type_idx on public.properties (property_type);
create index if not exists properties_price_idx        on public.properties (price);
create index if not exists properties_user_idx         on public.properties (user_id);
create index if not exists properties_created_idx      on public.properties (created_at desc);

alter table public.properties enable row level security;

drop policy if exists "active properties are readable by everyone" on public.properties;
create policy "active properties are readable by everyone"
  on public.properties for select
  using (status = 'active' or auth.uid() = user_id);

drop policy if exists "owners can insert their own properties" on public.properties;
create policy "owners can insert their own properties"
  on public.properties for insert
  with check (auth.uid() = user_id);

drop policy if exists "owners can update their own properties" on public.properties;
create policy "owners can update their own properties"
  on public.properties for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "owners can delete their own properties" on public.properties;
create policy "owners can delete their own properties"
  on public.properties for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- favorites
-- ---------------------------------------------------------------------
create table if not exists public.favorites (
  user_id     uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, property_id)
);

alter table public.favorites enable row level security;

drop policy if exists "users can read their own favorites" on public.favorites;
create policy "users can read their own favorites"
  on public.favorites for select
  using (auth.uid() = user_id);

drop policy if exists "users can manage their own favorites" on public.favorites;
create policy "users can manage their own favorites"
  on public.favorites for insert
  with check (auth.uid() = user_id);

drop policy if exists "users can delete their own favorites" on public.favorites;
create policy "users can delete their own favorites"
  on public.favorites for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- inquiries
-- ---------------------------------------------------------------------
create table if not exists public.inquiries (
  id                       uuid primary key default gen_random_uuid(),
  property_id              uuid not null references public.properties(id) on delete cascade,
  from_user_id             uuid references auth.users(id) on delete set null,
  from_name                text not null,
  from_email               text not null,
  from_phone               text,
  message                  text not null,
  consent_data_processing  boolean not null default false,
  created_at               timestamptz not null default now()
);

create index if not exists inquiries_property_idx on public.inquiries (property_id);
create index if not exists inquiries_created_idx  on public.inquiries (created_at desc);

alter table public.inquiries enable row level security;

drop policy if exists "anyone may submit an inquiry" on public.inquiries;
create policy "anyone may submit an inquiry"
  on public.inquiries for insert
  with check (consent_data_processing = true);

drop policy if exists "property owners can read inquiries" on public.inquiries;
create policy "property owners can read inquiries"
  on public.inquiries for select
  using (
    exists (
      select 1 from public.properties p
      where p.id = inquiries.property_id and p.user_id = auth.uid()
    )
    or auth.uid() = from_user_id
  );

-- ---------------------------------------------------------------------
-- saved_searches
-- ---------------------------------------------------------------------
create table if not exists public.saved_searches (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  filters       jsonb not null default '{}'::jsonb,
  notify_email  boolean not null default false,
  created_at    timestamptz not null default now()
);

alter table public.saved_searches enable row level security;

drop policy if exists "users can read their own searches" on public.saved_searches;
create policy "users can read their own searches"
  on public.saved_searches for select
  using (auth.uid() = user_id);

drop policy if exists "users can insert their own searches" on public.saved_searches;
create policy "users can insert their own searches"
  on public.saved_searches for insert
  with check (auth.uid() = user_id);

drop policy if exists "users can update their own searches" on public.saved_searches;
create policy "users can update their own searches"
  on public.saved_searches for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users can delete their own searches" on public.saved_searches;
create policy "users can delete their own searches"
  on public.saved_searches for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_properties_updated_at on public.properties;
create trigger trg_properties_updated_at
  before update on public.properties
  for each row execute function public.set_updated_at();

-- =====================================================================
-- Done.
-- Next step: create the storage bucket "property-images"
-- and apply the storage policies (see SUPABASE_SETUP.md).
-- =====================================================================
