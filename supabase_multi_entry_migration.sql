-- Multi-entry migration: allows up to 2 entries per user per game
-- Run in Supabase SQL editor

-- 1. Players: add entry_number (1 or 2) and entry_name
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS entry_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS entry_name TEXT NOT NULL DEFAULT 'Entry 1';

-- 2. Picks: track which entry each pick belongs to
ALTER TABLE picks
  ADD COLUMN IF NOT EXISTS entry_number INTEGER NOT NULL DEFAULT 1;

-- 3. Group members: track which entry joined the group
ALTER TABLE group_members
  ADD COLUMN IF NOT EXISTS entry_number INTEGER NOT NULL DEFAULT 1;

-- 4. Update group_members primary key to include entry_number
--    (allows same user to join same group with 2 different entries)
ALTER TABLE group_members DROP CONSTRAINT IF EXISTS group_members_pkey;
ALTER TABLE group_members ADD PRIMARY KEY (group_id, user_id, entry_number);
