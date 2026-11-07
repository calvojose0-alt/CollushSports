-- World Cup multi-entry migration: allows up to 2 entries per user
-- Run in Supabase SQL editor
-- NOTE: group_members already has entry_number from a previous migration — do NOT add it again

-- 1. WC Players: add entry_number (1 or 2) and entry_name
ALTER TABLE wc_players
  ADD COLUMN IF NOT EXISTS entry_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS entry_name TEXT NOT NULL DEFAULT 'Entry 1';

-- 2. WC Group stage picks: track which entry each pick belongs to
ALTER TABLE wc_picks
  ADD COLUMN IF NOT EXISTS entry_number INTEGER NOT NULL DEFAULT 1;

-- 3. WC Playoff picks: track which entry each pick belongs to
ALTER TABLE wc_playoff_picks
  ADD COLUMN IF NOT EXISTS entry_number INTEGER NOT NULL DEFAULT 1;
