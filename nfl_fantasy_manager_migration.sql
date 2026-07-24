-- ============================================================
-- NFL Fantasy Manager League — Phase 1 schema
-- Run in Supabase Dashboard → SQL Editor.
-- Tables/indexes are idempotent (IF NOT EXISTS). Policies are dropped
-- and recreated each run so this whole file is safe to re-run.
-- ============================================================

create extension if not exists pgcrypto;

-- ── nfl_players — global NFL player/D-ST catalog (seeded once via script) ──
create table if not exists nfl_players (
  id             text primary key,               -- stable slug, e.g. 'mahomes_patrick'
  external_id    text,
  display_name   text not null,
  position       text not null,                  -- QB | RB | WR | TE | K | DST
  nfl_team       text not null,                   -- e.g. 'KC'
  bye_week       integer,
  status         text not null default 'active',  -- active | injured | out | bye
  injury_status  text,
  active_flag    boolean not null default true,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- ── nfl_leagues ─────────────────────────────────────────────────────────
create table if not exists nfl_leagues (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  league_type           text not null default 'private',   -- public | private
  invite_code           text unique,
  commissioner_user_id  text not null,
  season_year           integer not null,
  status                text not null default 'setup',      -- setup | roster_build | active | complete
  budget_amount         bigint not null default 50000000,
  roster_mode           text not null default 'random',      -- random | empty | auction (auction unimplemented until Phase 2)
  roster_template       jsonb not null default '{"QB":2,"RB":4,"WR":4,"TE":2,"K":1,"DST":2}',
  lineup_template       jsonb not null default '["QB","RB","RB","WR","WR","TE","FLEX","DST","K"]',
  start_week            integer not null default 1,
  end_week              integer not null default 18,
  max_members           integer not null default 12,
  money_per_point       bigint not null default 1000000,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

create index if not exists idx_nfl_leagues_commissioner on nfl_leagues (commissioner_user_id);
create index if not exists idx_nfl_leagues_status on nfl_leagues (status);

-- ── nfl_scoring_profiles — one row per league (league_id is the lookup key) ─
create table if not exists nfl_scoring_profiles (
  id                   uuid primary key default gen_random_uuid(),
  league_id            uuid not null unique references nfl_leagues(id) on delete cascade,
  ppr_value            numeric not null default 0,        -- 0 | 0.5 | 1
  passing_yard_rate    numeric not null default 0.04,
  passing_td_points    numeric not null default 4,
  interception_points  numeric not null default -2,
  rushing_yard_rate    numeric not null default 0.1,
  receiving_yard_rate  numeric not null default 0.1,
  touchdown_points     numeric not null default 6,
  fumble_lost_points   numeric not null default -2,
  two_point_points     numeric not null default 2,
  kicker_rules         jsonb not null default '{"fg_0_39":3,"fg_40_49":4,"fg_50_plus":5,"xp":1,"missed_fg":-1}',
  dst_rules            jsonb not null default '{"sack":1,"interception":2,"fumble_recovery":2,"safety":2,"blocked_kick":2,"td":6,"points_allowed_tiers":[{"max":0,"pts":10},{"max":6,"pts":7},{"max":13,"pts":4},{"max":20,"pts":1},{"max":27,"pts":0},{"max":34,"pts":-1},{"max":999,"pts":-4}]}',
  bonus_rules          jsonb not null default '{"td_40_plus":0,"rush_rec_100":0,"pass_300":0}',
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- ── nfl_league_members ───────────────────────────────────────────────────
create table if not exists nfl_league_members (
  id             uuid primary key default gen_random_uuid(),
  league_id      uuid not null references nfl_leagues(id) on delete cascade,
  user_id        text not null,
  team_name      text not null,
  role           text not null default 'manager',   -- commissioner | manager
  balance        bigint not null default 0,
  season_points  numeric not null default 0,
  joined_at      timestamptz default now(),
  unique (league_id, user_id)
);

create index if not exists idx_nfl_league_members_league on nfl_league_members (league_id);
create index if not exists idx_nfl_league_members_user on nfl_league_members (user_id);

-- ── nfl_league_player_values ─────────────────────────────────────────────
create table if not exists nfl_league_player_values (
  id              uuid primary key default gen_random_uuid(),
  league_id       uuid not null references nfl_leagues(id) on delete cascade,
  player_id       text not null references nfl_players(id),
  market_value    bigint not null,
  purchase_price  bigint not null,
  acquired_at     timestamptz default now(),
  unique (league_id, player_id)
);

-- ── nfl_roster_slots — unique(league_id, player_id) enforces single ownership ──
create table if not exists nfl_roster_slots (
  id                uuid primary key default gen_random_uuid(),
  league_id         uuid not null references nfl_leagues(id) on delete cascade,
  manager_id        uuid not null references nfl_league_members(id) on delete cascade,
  player_id         text not null references nfl_players(id),
  acquisition_type  text not null default 'random_draw',  -- random_draw | empty_pickup | admin_assign
  purchase_price    bigint not null default 0,
  acquired_at       timestamptz default now(),
  unique (league_id, player_id)
);

create index if not exists idx_nfl_roster_slots_manager on nfl_roster_slots (manager_id);

-- ── nfl_weekly_lineups ────────────────────────────────────────────────────
create table if not exists nfl_weekly_lineups (
  id                  uuid primary key default gen_random_uuid(),
  league_id           uuid not null references nfl_leagues(id) on delete cascade,
  manager_id          uuid not null references nfl_league_members(id) on delete cascade,
  nfl_week            integer not null,
  lineup_status       text not null default 'open',   -- open | locked | scored
  locked_at           timestamptz,
  empty_slot_penalty  numeric not null default 0,
  no_score_reason     text,
  total_points        numeric not null default 0,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  unique (league_id, manager_id, nfl_week)
);

create index if not exists idx_nfl_weekly_lineups_week on nfl_weekly_lineups (league_id, nfl_week);

-- ── nfl_lineup_slots ──────────────────────────────────────────────────────
create table if not exists nfl_lineup_slots (
  id                     uuid primary key default gen_random_uuid(),
  weekly_lineup_id       uuid not null references nfl_weekly_lineups(id) on delete cascade,
  slot_type              text not null,    -- QB | RB1 | RB2 | WR1 | WR2 | TE | FLEX | DST | K
  player_id              text references nfl_players(id),
  slot_points            numeric not null default 0,
  is_empty               boolean not null default true,
  was_substituted        boolean not null default false,
  calculation_breakdown  jsonb,
  unique (weekly_lineup_id, slot_type)
);

-- ── nfl_player_week_stats — global, not per-league ───────────────────────
create table if not exists nfl_player_week_stats (
  id                     uuid primary key default gen_random_uuid(),
  player_id              text not null references nfl_players(id),
  nfl_week               integer not null,
  season_year            integer not null,
  passing_yards          integer not null default 0,
  passing_tds            integer not null default 0,
  interceptions          integer not null default 0,
  rushing_yards          integer not null default 0,
  rushing_tds            integer not null default 0,
  receiving_yards        integer not null default 0,
  receiving_tds          integer not null default 0,
  receptions             integer not null default 0,
  fumbles_lost           integer not null default 0,
  two_point_conversions  integer not null default 0,
  kicking                jsonb not null default '{"fg_0_39":0,"fg_40_49":0,"fg_50_plus":0,"xp_made":0,"fg_missed":0}',
  dst                    jsonb not null default '{"sacks":0,"interceptions":0,"fumble_recoveries":0,"safeties":0,"blocked_kicks":0,"tds":0,"points_allowed":0}',
  source                 text not null default 'manual',
  entered_by_user_id     text,
  updated_at             timestamptz default now(),
  unique (player_id, nfl_week, season_year)
);

create index if not exists idx_nfl_player_week_stats_week on nfl_player_week_stats (nfl_week, season_year);

-- ── nfl_transactions — permanent audit trail of money/player movement ────
create table if not exists nfl_transactions (
  id                uuid primary key default gen_random_uuid(),
  league_id         uuid not null references nfl_leagues(id) on delete cascade,
  transaction_type  text not null,     -- roster_draw | admin_assign | admin_correction
  from_manager_id   uuid references nfl_league_members(id),
  to_manager_id     uuid references nfl_league_members(id),
  player_id         text references nfl_players(id),
  amount            bigint not null default 0,
  status            text not null default 'completed',
  executed_at       timestamptz default now(),
  notes             text
);

create index if not exists idx_nfl_transactions_league on nfl_transactions (league_id);

-- ── nfl_audit_logs — admin override trail ────────────────────────────────
create table if not exists nfl_audit_logs (
  id             uuid primary key default gen_random_uuid(),
  actor_user_id  text not null,
  league_id      uuid references nfl_leagues(id) on delete cascade,
  action_type    text not null,
  entity_type    text not null,
  entity_id      text,
  before_json    jsonb,
  after_json     jsonb,
  created_at     timestamptz default now()
);

create index if not exists idx_nfl_audit_logs_league on nfl_audit_logs (league_id);

-- ============================================================
-- Row Level Security
-- Matches this repo's existing convention (app-level gating via
-- Firebase-authenticated routes; DB policies stay permissive since
-- there is no Supabase-native auth.uid() to check against — see
-- wl_session's "Service role full access ... USING (true)" policy).
-- ============================================================

alter table nfl_players              enable row level security;
alter table nfl_leagues               enable row level security;
alter table nfl_scoring_profiles      enable row level security;
alter table nfl_league_members        enable row level security;
alter table nfl_league_player_values  enable row level security;
alter table nfl_roster_slots          enable row level security;
alter table nfl_weekly_lineups        enable row level security;
alter table nfl_lineup_slots          enable row level security;
alter table nfl_player_week_stats     enable row level security;
alter table nfl_transactions          enable row level security;
alter table nfl_audit_logs            enable row level security;

drop policy if exists "Full access nfl_players" on nfl_players;
create policy "Full access nfl_players" on nfl_players for all using (true) with check (true);

drop policy if exists "Full access nfl_leagues" on nfl_leagues;
create policy "Full access nfl_leagues" on nfl_leagues for all using (true) with check (true);

drop policy if exists "Full access nfl_scoring_profiles" on nfl_scoring_profiles;
create policy "Full access nfl_scoring_profiles" on nfl_scoring_profiles for all using (true) with check (true);

drop policy if exists "Full access nfl_league_members" on nfl_league_members;
create policy "Full access nfl_league_members" on nfl_league_members for all using (true) with check (true);

drop policy if exists "Full access nfl_league_player_values" on nfl_league_player_values;
create policy "Full access nfl_league_player_values" on nfl_league_player_values for all using (true) with check (true);

drop policy if exists "Full access nfl_roster_slots" on nfl_roster_slots;
create policy "Full access nfl_roster_slots" on nfl_roster_slots for all using (true) with check (true);

drop policy if exists "Full access nfl_weekly_lineups" on nfl_weekly_lineups;
create policy "Full access nfl_weekly_lineups" on nfl_weekly_lineups for all using (true) with check (true);

drop policy if exists "Full access nfl_lineup_slots" on nfl_lineup_slots;
create policy "Full access nfl_lineup_slots" on nfl_lineup_slots for all using (true) with check (true);

drop policy if exists "Full access nfl_player_week_stats" on nfl_player_week_stats;
create policy "Full access nfl_player_week_stats" on nfl_player_week_stats for all using (true) with check (true);

drop policy if exists "Full access nfl_transactions" on nfl_transactions;
create policy "Full access nfl_transactions" on nfl_transactions for all using (true) with check (true);

drop policy if exists "Full access nfl_audit_logs" on nfl_audit_logs;
create policy "Full access nfl_audit_logs" on nfl_audit_logs for all using (true) with check (true);
