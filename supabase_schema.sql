-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  LUMINA BIRTHDAY INVITATION — Supabase Schema Completo        ║
-- ║  Ejecutar en Supabase > SQL Editor (en orden)                 ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- ──────────────────────────────────────────────────────────────────
-- 1. CONFIGURATION (Stores event details)
-- ──────────────────────────────────────────────────────────────────
create table config (
  id int primary key generated always as identity,
  key text unique not null,
  value jsonb not null
);

-- Insert default config (includes supervisor credentials)
insert into config (key, value) values 
('event_settings', '{
  "dateDisplay": "28 . 02",
  "fullDate": "Sábado, 28 de Febrero 2026",
  "time": "09:00 PM",
  "locationPlaceholder": "Ubicación por Confirmar",
  "adminUser": "71267719",
  "adminPassword": "S0p0rt3#",
  "supervisorUser": "supervisor",
  "supervisorPassword": "Scan2026",
  "winningVenueId": null,
  "maxCapacity": 50
}'::jsonb),
('venues', '[
  {"id": "v1", "name": "Skyline Rooftop", "votes": 0},
  {"id": "v2", "name": "The Urban Pub", "votes": 0}
]'::jsonb);

-- ──────────────────────────────────────────────────────────────────
-- 2. GUESTS (Your whitelist)
-- ──────────────────────────────────────────────────────────────────
create table guests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text unique not null,
  used boolean default false,
  used_at timestamptz
);

-- ──────────────────────────────────────────────────────────────────
-- 3. RSVPS (Confirmed attendees)
-- ──────────────────────────────────────────────────────────────────
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

-- ──────────────────────────────────────────────────────────────────
-- 4. TICKET TIERS (Stock-tracked categories)
-- ──────────────────────────────────────────────────────────────────
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

-- Insert default tiers (including HOST tier for birthday boy)
insert into ticket_tiers (id, name, description, stock, color, gradient, border, perks) values
  ('host', 'THE HOST 👑', 'El Anfitrión — Exclusivo', 1, 'text-yellow-300', 'from-yellow-400/30 to-amber-900/50', 'border-yellow-400/50', ARRAY['👑 Es Mi Fiesta', '🍾 Barra Libre Total', '⚡ Acceso Total', '🎶 DJ Dedicado']),
  ('platinum', 'PLATINUM VIP', 'Acceso total + Barra Libre', 4, 'text-amber-400', 'from-amber-400/20 to-amber-900/40', 'border-amber-400/30', ARRAY['🍸 1 Trago Personal Gratis', 'Barra Libre', 'Zona VIP', 'Meet & Greet']),
  ('emerald', 'EMERALD GUEST', 'Acceso Preferencial', 12, 'text-emerald-400', 'from-emerald-400/20 to-emerald-900/40', 'border-emerald-400/30', ARRAY['Zona Preferencial', 'Welcome Drink']),
  ('standard', 'STANDARD ECHO', 'Acceso General', 25, 'text-gray-400', 'from-gray-600/20 to-gray-900/40', 'border-white/10', ARRAY['Acceso General']);

-- ──────────────────────────────────────────────────────────────────
-- 5. ATOMIC STOCK DECREMENT (Prevents double-claiming tickets)
-- ──────────────────────────────────────────────────────────────────
create or replace function claim_ticket(tier_id text)
returns int
language plpgsql
security definer
set search_path = public
as $$
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
$$;

-- ──────────────────────────────────────────────────────────────────
-- 6. TICKET SCANS (Tracks scanned/used tickets at the door)
-- ──────────────────────────────────────────────────────────────────
create table ticket_scans (
  id uuid default gen_random_uuid() primary key,
  ticket_id text unique not null,
  guest_name text,
  guest_email text,
  tier_name text,
  scanned_at timestamptz default now()
);

-- ──────────────────────────────────────────────────────────────────
-- 7. ENABLE REALTIME (Admin Panel updates instantly)
-- ──────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table config, guests, rsvps, ticket_tiers, ticket_scans;

-- ──────────────────────────────────────────────────────────────────
-- 8. DATA INTEGRITY (Prevent duplicate RSVPs per phone)
-- ──────────────────────────────────────────────────────────────────

-- 8.1 First, delete any existing duplicates (keeping the latest one)
delete from rsvps
where id in (
  select id
  from (
    select id,
           row_number() over (partition by phone order by created_at desc) as rn
    from rsvps
  ) t
  where t.rn > 1
);

-- 8.2 Then, apply the unique constraint
alter table rsvps add constraint rsvps_phone_key unique (phone);

-- ──────────────────────────────────────────────────────────────────
-- 9. UTILITY QUERIES (Run manually when needed)
-- ──────────────────────────────────────────────────────────────────

-- 9.1 Add HOST tier if it doesn't exist yet (run this if you created the DB before HOST was added)
-- INSERT INTO ticket_tiers (id, name, description, stock, color, gradient, border, perks) VALUES
-- ('host', 'THE HOST 👑', 'El Anfitrión — Exclusivo', 1, 'text-yellow-300', 'from-yellow-400/30 to-amber-900/50', 'border-yellow-400/50', ARRAY['👑 Es Mi Fiesta', '🍾 Barra Libre Total', '⚡ Acceso Total', '🎶 DJ Dedicado'])
-- ON CONFLICT (id) DO NOTHING;

-- 9.2 Add supervisor credentials to existing config (if DB was created before supervisor feature)
-- UPDATE config SET value = value || '{"supervisorUser": "supervisor", "supervisorPassword": "Scan2026"}'::jsonb WHERE key = 'event_settings';

-- 9.3 Clear all scan records (useful for testing)
-- DELETE FROM ticket_scans;

-- 9.4 Delete a specific guest and all their records
-- DELETE FROM ticket_scans WHERE ticket_id IN (SELECT unnest(ticket_ids) FROM rsvps WHERE phone = 'PHONE_HERE');
-- DELETE FROM rsvps WHERE phone = 'PHONE_HERE';
-- DELETE FROM guests WHERE phone = 'PHONE_HERE';

-- 9.5 Reset a tier's stock
-- UPDATE ticket_tiers SET stock = 1 WHERE id = 'host';
-- UPDATE ticket_tiers SET stock = 4 WHERE id = 'platinum';
-- UPDATE ticket_tiers SET stock = 12 WHERE id = 'emerald';
-- UPDATE ticket_tiers SET stock = 25 WHERE id = 'standard';
