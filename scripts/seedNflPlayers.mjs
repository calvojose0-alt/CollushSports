/**
 * seedNflPlayers.mjs
 * One-time upsert of the static NFL player/D-ST catalog (src/data/nflPlayers.js)
 * into the Supabase `nfl_players` table. Safe to re-run — upserts by id.
 *
 * Requires the nfl_fantasy_manager_migration.sql tables to already exist.
 * Run: node scripts/seedNflPlayers.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import { NFL_PLAYERS } from '../src/data/nflPlayers.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

function loadEnvLocal() {
  const envPath = path.join(ROOT, '.env.local')
  const env = {}
  if (!fs.existsSync(envPath)) return env
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (match) env[match[1]] = match[2].trim()
  }
  return env
}

async function main() {
  const env = loadEnvLocal()
  const url = env.VITE_SUPABASE_URL
  const key = env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) {
    console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env.local')
    process.exit(1)
  }

  const supabase = createClient(url, key)

  const rows = NFL_PLAYERS.map((p) => ({
    id: p.id,
    display_name: p.displayName,
    position: p.position,
    nfl_team: p.nflTeam,
    bye_week: p.byeWeek,
    status: p.status,
    injury_status: p.injuryStatus,
    active_flag: p.activeFlag,
  }))

  console.log(`Upserting ${rows.length} players into nfl_players...`)

  const CHUNK = 200
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    const { error } = await supabase.from('nfl_players').upsert(chunk, { onConflict: 'id' })
    if (error) {
      console.error(`Failed on chunk starting at ${i}:`, error.message)
      process.exit(1)
    }
    console.log(`  ...${Math.min(i + CHUNK, rows.length)}/${rows.length}`)
  }

  console.log('Done.')
}

main()
