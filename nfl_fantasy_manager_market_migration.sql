-- ============================================================
-- NFL Fantasy Manager League — Phase 2 schema (market cycles, secret
-- bids, manager sales)
-- Run in Supabase Dashboard → SQL Editor, after nfl_fantasy_manager_migration.sql.
-- Tables/indexes are idempotent (IF NOT EXISTS). Policies are dropped
-- and recreated each run so this whole file is safe to re-run.
-- ============================================================

-- ── nfl_market_cycles — free-agent bidding windows, commissioner-triggered ──
create table if not exists nfl_market_cycles (
  id            uuid primary key default gen_random_uuid(),
  league_id     uuid not null references nfl_leagues(id) on delete cascade,
  cycle_number  integer not null,
  status        text not null default 'open',   -- open | executed
  opened_at     timestamptz default now(),
  executed_at   timestamptz,
  unique (league_id, cycle_number)
);

create index if not exists idx_nfl_market_cycles_league on nfl_market_cycles (league_id);

-- ── nfl_market_listings — free-agent listings (tied to a cycle) and ─────────
-- ── manager sale offers (not tied to a cycle — market_cycle_id is null) ────
create table if not exists nfl_market_listings (
  id                uuid primary key default gen_random_uuid(),
  league_id         uuid not null references nfl_leagues(id) on delete cascade,
  market_cycle_id   uuid references nfl_market_cycles(id) on delete cascade,
  player_id         text not null references nfl_players(id),
  listing_type      text not null,                    -- free_agent | manager_sale
  starting_value    bigint not null,
  seller_manager_id uuid references nfl_league_members(id),
  status            text not null default 'open',      -- open | sold | unsold | cancelled
  created_at        timestamptz default now(),
  resolved_at       timestamptz
);

create index if not exists idx_nfl_market_listings_cycle on nfl_market_listings (market_cycle_id);
create index if not exists idx_nfl_market_listings_league_status on nfl_market_listings (league_id, status);
create index if not exists idx_nfl_market_listings_seller on nfl_market_listings (seller_manager_id);

-- ── nfl_bids — secret bids on free-agent listings only ──────────────────────
create table if not exists nfl_bids (
  id                 uuid primary key default gen_random_uuid(),
  listing_id         uuid not null references nfl_market_listings(id) on delete cascade,
  league_id          uuid not null references nfl_leagues(id) on delete cascade,
  bidder_manager_id  uuid not null references nfl_league_members(id) on delete cascade,
  bid_amount         bigint not null,
  submitted_at       timestamptz default now(),
  status             text not null default 'pending',   -- pending | won | lost
  unique (listing_id, bidder_manager_id)
);

create index if not exists idx_nfl_bids_listing on nfl_bids (listing_id);

-- ============================================================
-- Row Level Security — same open-policy convention as the Phase 1
-- migration (app-level gating; no Supabase-native auth.uid() to check
-- against since this app authenticates via Firebase, not Supabase auth).
-- ============================================================

alter table nfl_market_cycles   enable row level security;
alter table nfl_market_listings enable row level security;
alter table nfl_bids            enable row level security;

drop policy if exists "Full access nfl_market_cycles" on nfl_market_cycles;
create policy "Full access nfl_market_cycles" on nfl_market_cycles for all using (true) with check (true);

drop policy if exists "Full access nfl_market_listings" on nfl_market_listings;
create policy "Full access nfl_market_listings" on nfl_market_listings for all using (true) with check (true);

drop policy if exists "Full access nfl_bids" on nfl_bids;
create policy "Full access nfl_bids" on nfl_bids for all using (true) with check (true);
