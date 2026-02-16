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

-- Enable Realtime (so Admin Panel updates instantly)
alter publication supabase_realtime add table config, guests, rsvps;
