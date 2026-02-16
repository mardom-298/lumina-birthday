-- 1. CONFIGURATION (Stores event details)
create table config (
  id int primary key generated always as identity,
  key text unique not null,
  value jsonb not null
);

-- Insert default config
insert into config (key, value) values 
('event_settings', '{"dateDisplay": "28 . 02", "fullDate": "Sábado, 28 de Febrero 2026", "time": "09:00 PM", "locationPlaceholder": "Ubicación por Confirmar", "adminUser": "71267719", "adminPassword": "S0p0rt3#", "winningVenueId": null, "maxCapacity": 50}'::jsonb),
('venues', '[{"id": "v1", "name": "Skyline Rooftop", "votes": 0}, {"id": "v2", "name": "The Urban Pub", "votes": 0}]'::jsonb);

-- 2. GUESTS (Your whitelist)
create table guests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text unique not null,
  used boolean default false,
  used_at timestamptz
);

-- 3. RSVPS (Confirmed attendees)
create table rsvps (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  song_request text,
  selected_venue_id text,
  selected_tier_id text,
  guest_count int default 0,
  ticket_ids text[], -- Array of generated ticket IDs
  created_at timestamptz default now()
);

-- 4. TICKET TIERS (Stock-tracked categories)
create table ticket_tiers (
  id text primary key,
  name text not null,
  description text,
  stock int not null default 0,
  color text,
  gradient text,
  border text,
  perks text[]
);

-- Insert default tiers
insert into ticket_tiers (id, name, description, stock, color, gradient, border, perks) values
  ('platinum', 'PLATINUM VIP', 'Acceso total + Barra Libre', 5, 'text-amber-400', 'from-amber-400/20 to-amber-900/40', 'border-amber-400/30', ARRAY['Barra Libre', 'Zona VIP', 'Meet & Greet']),
  ('emerald', 'EMERALD GUEST', 'Acceso Preferencial', 12, 'text-emerald-400', 'from-emerald-400/20 to-emerald-900/40', 'border-emerald-400/30', ARRAY['Zona Preferencial', 'Welcome Drink']),
  ('standard', 'STANDARD ECHO', 'Acceso General', 25, 'text-gray-400', 'from-gray-600/20 to-gray-900/40', 'border-white/10', ARRAY['Acceso General']);

-- Atomic stock decrement function (prevents double-claiming)
create or replace function claim_ticket(tier_id text)
returns int as $$
declare
  remaining int;
begin
  update ticket_tiers
  set stock = stock - 1
  where id = tier_id and stock > 0
  returning stock into remaining;

  if remaining is null then
    return -1; -- No stock available
  end if;

  return remaining;
end;
$$ language plpgsql;

-- 5. TICKET SCANS (Tracks scanned/used tickets at the door)
create table ticket_scans (
  id uuid default gen_random_uuid() primary key,
  ticket_id text unique not null,
  guest_name text,
  guest_email text,
  tier_name text,
  scanned_at timestamptz default now()
);

-- Enable Realtime (so Admin Panel updates instantly)
alter publication supabase_realtime add table config, guests, rsvps, ticket_tiers, ticket_scans;
