-- ============================================================
-- Win League 2026 — Offline Draft Import
-- Run in Supabase Dashboard → SQL Editor (postgres / service role).
-- Idempotent: safe to re-run (ON CONFLICT upserts).
--
-- HOW TO USE
--   1. In STEP 1, set each player's Collush login email.
--      - Player WITH an account  -> put their email.
--      - Player WITHOUT an account -> leave email NULL.
--        A placeholder profile is created so the draft still renders;
--        you can re-run this script with their real email later to
--        re-attach the picks to their account.
--   2. Run the whole script.
--   3. STEP 2's SELECT prints how each player resolved — confirm
--      no intended account fell through to a placeholder (typo'd email).
-- ============================================================

-- STEP 1 — Player → account email mapping ---------------------
drop table if exists _wl_map;
create temp table _wl_map (name text primary key, email text);
insert into _wl_map (name, email) values
  ('Juan',    'jcalvo222@hotmail.com'),   -- confirmed
  ('Luisma',  'ldossantosm@gmail.com'),   -- confirmed
  ('Ignacio', 'ignaciovinke@gmail.com'),  -- confirmed
  ('Jose',    'jcalvo87@hotmail.com'),    -- confirmed
  ('Victor',  NULL),   -- no account — placeholder
  ('Luis E',  NULL),   -- no account — placeholder
  ('Oscar',   NULL),   -- no account — placeholder
  ('Lupa',    'robertolupini@gmail.com'); -- Roberto Lupini, confirmed

-- STEP 2 — Resolve each player to a user_id (text) ------------
--   account  -> auth.users.id
--   no email -> deterministic placeholder id 'guest_<name>'
drop table if exists _wl_acct;
create temp table _wl_acct (name text primary key, user_id text, is_placeholder boolean);
insert into _wl_acct (name, user_id, is_placeholder)
select m.name,
       coalesce(u.id::text, 'guest_' || lower(regexp_replace(m.name, '\s+', '_', 'g'))),
       (u.id is null)
from _wl_map m
left join auth.users u on lower(u.email) = lower(m.email);

-- Confirm resolution before trusting the import:
select name, user_id, is_placeholder from _wl_acct order by name;

-- STEP 3 — Draft picks (pick_number is 0-based, matches app) --
drop table if exists _wl_draft;
create temp table _wl_draft (pick_number int primary key, name text, team_id text);
insert into _wl_draft (pick_number, name, team_id) values
  (0,  'Juan',    'france'),       -- Francia
  (1,  'Ignacio', 'spain'),        -- España
  (2,  'Luisma',  'england'),      -- Inglaterra
  (3,  'Lupa',    'portugal'),     -- Portugal
  (4,  'Jose',    'netherlands'),  -- Holanda
  (5,  'Victor',  'argentina'),    -- Argentina
  (6,  'Luis E',  'germany'),      -- Alemania
  (7,  'Oscar',   'brazil'),       -- Brasil
  (8,  'Lupa',    'croatia'),      -- Croacia
  (9,  'Luis E',  'belgium'),      -- Bélgica
  (10, 'Victor',  'switzerland'),  -- Suiza
  (11, 'Jose',    'mexico'),       -- México
  (12, 'Oscar',   'uruguay'),      -- Uruguay
  (13, 'Ignacio', 'colombia'),     -- Colombia
  (14, 'Juan',    'morocco'),      -- Marruecos
  (15, 'Luisma',  'japan'),        -- Japón
  (16, 'Luisma',  'senegal'),      -- Senegal
  (17, 'Oscar',   'ecuador'),      -- Ecuador
  (18, 'Victor',  'paraguay'),     -- Paraguay
  (19, 'Luis E',  'southkorea'),   -- Corea
  (20, 'Ignacio', 'norway'),       -- Noruega
  (21, 'Juan',    'algeria'),      -- Algeria
  (22, 'Jose',    'turkey'),       -- Turquía
  (23, 'Lupa',    'usa');          -- USA

-- STEP 4 — Upsert players ------------------------------------
insert into wl_players (id, user_id, display_name, total_points, match_points, advance_points, total_wins)
select 'wl2026_' || a.user_id, a.user_id, a.name, 0, 0, 0, 0
from _wl_acct a
on conflict (id) do update set display_name = excluded.display_name;

-- STEP 5 — Upsert session (locked, draft order in pick order) -
insert into wl_session (id, status, draft_order, current_pick, max_players, picks_per_player, updated_at)
select 'wl2026',
       'locked',
       (select array_agg(a.user_id order by d.pick_number)
          from _wl_draft d join _wl_acct a on a.name = d.name),
       24, 8, 3, now()
on conflict (id) do update set
  status           = excluded.status,
  draft_order      = excluded.draft_order,
  current_pick     = excluded.current_pick,
  max_players      = excluded.max_players,
  picks_per_player = excluded.picks_per_player,
  updated_at       = now();

-- STEP 6 — Insert picks --------------------------------------
insert into wl_picks (id, user_id, team_id, pick_number)
select 'wl2026_' || d.team_id, a.user_id, d.team_id, d.pick_number
from _wl_draft d join _wl_acct a on a.name = d.name
on conflict (id) do update set
  user_id     = excluded.user_id,
  pick_number = excluded.pick_number;

-- Verify final result -----------------------------------------
select p.pick_number, pl.display_name, p.team_id
from wl_picks p
join wl_players pl on pl.user_id = p.user_id
where p.id like 'wl2026_%'
order by p.pick_number;
