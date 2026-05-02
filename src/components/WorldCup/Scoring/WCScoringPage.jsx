import { Star, Flag, Medal, Trophy, Target, LayoutGrid, Circle } from 'lucide-react'
import { SCORING } from '@/data/wc2026Teams'

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({ icon: Icon, iconColor = 'text-yellow-400', title, subtitle, children }) {
  return (
    <div className="card space-y-4">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex-shrink-0 ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-white text-base">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

// ── Scoring table ──────────────────────────────────────────────────────────────
function ScoringTable({ rows }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-700">
          <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Result</th>
          <th className="text-right pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Points</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-800">
        {rows.map(({ label, sublabel, pts, color = 'text-yellow-400', dim }) => (
          <tr key={label} className={dim ? 'opacity-50' : ''}>
            <td className="py-2.5 pr-4 text-gray-300 leading-snug">
              {label}
              {sublabel && <span className="block text-xs text-gray-500 mt-0.5">{sublabel}</span>}
            </td>
            <td className={`py-2.5 text-right font-bold whitespace-nowrap ${color}`}>
              {pts}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── Max points callout ─────────────────────────────────────────────────────────
function MaxBadge({ label, pts }) {
  return (
    <div className="flex items-center justify-between bg-gray-800/60 rounded-lg px-3 py-2 text-xs">
      <span className="text-gray-500">{label}</span>
      <span className="font-bold text-gray-300">max {pts} pts</span>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function WCScoringPage() {
  return (
    <div className="space-y-5 max-w-2xl">

      {/* Header */}
      <div className="flex items-center gap-2">
        <Star className="w-5 h-5 text-yellow-400" />
        <h2 className="font-bold text-blue-800 text-lg">Scoring Rules</h2>
      </div>
      <p className="text-sm text-blue-700 -mt-3">
        Points are awarded across three categories. The full tournament runs 104 games — 72 group stage and 32 knockout.
      </p>

      {/* ── 1. Group Stage Picks ─────────────────────────────────────────────── */}
      <Section
        icon={Flag}
        iconColor="text-green-400"
        title="Group Stage Picks"
        subtitle="Predict the exact score of each of the 72 group stage matches."
      >
        <ScoringTable rows={[
          {
            label:    'Exact score',
            sublabel: 'e.g. you picked 2-1, actual result 2-1',
            pts:      `+${SCORING.GROUP_EXACT_SCORE} pts`,
            color:    'text-green-400',
          },
          {
            label:    'Correct outcome only',
            sublabel: 'Right win / draw / loss, but wrong scoreline',
            pts:      `+${SCORING.GROUP_CORRECT_OUTCOME} pts`,
            color:    'text-blue-400',
          },
          {
            label:    'Wrong outcome',
            pts:      '0 pts',
            color:    'text-gray-600',
            dim:      true,
          },
        ]} />
        <MaxBadge label="72 matches × 4 pts" pts={72 * SCORING.GROUP_EXACT_SCORE} />
      </Section>

      {/* ── 2. Group Qualification Bonus ─────────────────────────────────────── */}
      <Section
        icon={Medal}
        iconColor="text-yellow-400"
        title="Group Qualification Bonus"
        subtitle="After all 6 matches in a group are complete, your predicted group standings (derived automatically from your score picks) are compared to the actual final standings."
      >
        <ScoringTable rows={[
          {
            label:    'Predicted 1st place — team finishes 1st',
            pts:      `+${SCORING.GROUP_QUALIFY_EXACT} pts`,
            color:    'text-yellow-400',
          },
          {
            label:    'Predicted 2nd place — team finishes 2nd',
            pts:      `+${SCORING.GROUP_QUALIFY_EXACT} pts`,
            color:    'text-yellow-400',
          },
          {
            label:    'Predicted 3rd place — team qualifies as best 3rd',
            sublabel: '8 best 3rd-place teams advance; scored once R32 bracket is confirmed',
            pts:      `+${SCORING.GROUP_QUALIFY_EXACT} pts`,
            color:    'text-yellow-400',
          },
          {
            label:    'Team qualified but in a different position',
            sublabel: 'Applies in every direction: predicted 1st but finished 2nd · predicted 3rd but finished 1st · predicted 1st/2nd but qualified as best 3rd',
            pts:      `+${SCORING.GROUP_QUALIFY_POSITION} pts`,
            color:    'text-orange-400',
          },
          {
            label:    "Team didn't qualify",
            pts:      '0 pts',
            color:    'text-gray-600',
            dim:      true,
          },
        ]} />
        <MaxBadge label="12 groups × 8 pts + 8 best-3rd teams × 4 pts" pts={12 * SCORING.GROUP_QUALIFY_EXACT * 2 + 8 * SCORING.GROUP_QUALIFY_EXACT} />
      </Section>

      {/* ── 3. Knockout Bracket Picks ────────────────────────────────────────── */}
      <Section
        icon={Trophy}
        iconColor="text-yellow-400"
        title="Knockout Bracket Picks"
        subtitle="Points are awarded per team you correctly predict advancing to each round. You only need to pick the team to reach the round — not the exact bracket slot or opponent."
      >
        <ScoringTable rows={[
          {
            label:    'Round of 16',
            sublabel: 'Teams advancing from Round of 32',
            pts:      `+${SCORING.PLAYOFF_R16} pts each`,
          },
          {
            label:    'Quarterfinals',
            sublabel: 'Teams advancing from Round of 16',
            pts:      `+${SCORING.PLAYOFF_QF} pts each`,
          },
          {
            label:    'Semifinals',
            sublabel: 'Teams advancing from Quarterfinals',
            pts:      `+${SCORING.PLAYOFF_SF} pts each`,
          },
          {
            label:    'Champion',
            pts:      `+${SCORING.PLAYOFF_WINNER} pts`,
            color:    'text-yellow-300',
          },
        ]} />

        {/* Note about R32 */}
        <div className="bg-gray-800/50 rounded-lg px-3 py-2.5 text-xs text-gray-400 leading-relaxed">
          <span className="text-gray-300 font-semibold">Note:</span> Round of 32 bracket slots are filled from your group stage picks and award{' '}
          <span className="text-white font-semibold">0 pts</span> — who advances to R32 is already covered by the Group Qualification Bonus above.
        </div>

        <MaxBadge
          label={`16×${SCORING.PLAYOFF_R16} + 8×${SCORING.PLAYOFF_QF} + 4×${SCORING.PLAYOFF_SF} + ${SCORING.PLAYOFF_WINNER}`}
          pts={16 * SCORING.PLAYOFF_R16 + 8 * SCORING.PLAYOFF_QF + 4 * SCORING.PLAYOFF_SF + SCORING.PLAYOFF_WINNER}
        />
      </Section>

      {/* ── 4. Tiebreakers ──────────────────────────────────────────────────── */}
      <Section
        icon={Target}
        iconColor="text-purple-400"
        title="Tiebreakers"
        subtitle="Used only when two or more players finish with the same total points, applied in order."
      >
        <ol className="space-y-3 text-sm">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-900/60 border border-purple-700 text-purple-300 text-xs font-bold flex items-center justify-center">1</span>
            <div>
              <p className="text-gray-300 font-semibold">Most exact-score hits</p>
              <p className="text-xs text-gray-500 mt-0.5">Group stage picks where both the home and away score matched perfectly.</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-900/60 border border-purple-700 text-purple-300 text-xs font-bold flex items-center justify-center">2</span>
            <div>
              <p className="text-gray-300 font-semibold">Closest total goals guess</p>
              <p className="text-xs text-gray-500 mt-0.5">Predict the total number of goals scored across all 104 tournament games. Entered on the Knockout Bracket page before picks lock. Whoever is closest to the real number wins the tiebreak.</p>
            </div>
          </li>
        </ol>
      </Section>

      {/* ── 5. Bracket Visual Guide — Before Results ─────────────────────────── */}
      <Section
        icon={Circle}
        iconColor="text-gray-400"
        title="Bracket Visual Guide — Before Results"
        subtitle="While a knockout match is still pending (no result entered yet), two indicators show the state of each team."
      >
        {/* Pick arrow */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Your Current Pick</p>
          <div className="flex items-start gap-3 bg-gray-800/40 rounded-lg px-3 py-2.5">
            <span className="text-yellow-400 font-bold text-sm flex-shrink-0 mt-0.5">▶</span>
            <div>
              <p className="text-xs font-bold text-yellow-400">Yellow arrow — your pick</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                Appears to the right of whichever team you've selected to win this match and advance. No background shading — just the arrow.
              </p>
            </div>
          </div>
        </div>

        {/* Status dots */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Live Team Status Dot</p>
          <p className="text-xs text-gray-500 mb-3 leading-relaxed">
            A small colored dot appears beside each team name showing their current real-world tournament status. Updates automatically as results are entered — a green dot can turn red mid-tournament if a team gets knocked out.
          </p>
          <div className="space-y-2.5">
            {[
              {
                dot:        'bg-green-400',
                label:      '● Green — Alive, exact path',
                labelColor: 'text-green-400',
                desc:       "Team qualified from groups exactly as you predicted and hasn't been eliminated yet.",
              },
              {
                dot:        'bg-amber-400',
                label:      '● Amber — Alive, different path',
                labelColor: 'text-amber-400',
                desc:       'Team is still in the tournament but came through a different group position than you predicted (e.g. you picked them 1st but they finished 2nd, or advanced as best 3rd-place).',
              },
              {
                dot:        'bg-red-500',
                label:      '● Red — Eliminated',
                labelColor: 'text-red-400',
                desc:       "Team is out — they didn't qualify from the group stage or have already lost a knockout match. The red dot appears in every later round where you still have them picked.",
              },
            ].map(({ dot, label, labelColor, desc }) => (
              <div key={label} className="flex items-start gap-3">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5 ${dot}`} />
                <div>
                  <p className={`text-xs font-bold ${labelColor}`}>{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg px-3 py-2.5 text-xs text-gray-400 leading-relaxed">
          <span className="text-gray-300 font-semibold">Tip:</span> The column header above each round shows a live count of green, amber, and red-dot teams — so you can see at a glance how many of your picks are still alive across the full bracket.
        </div>
      </Section>

      {/* ── 6. Bracket Visual Guide — After Results ──────────────────────────── */}
      <Section
        icon={LayoutGrid}
        iconColor="text-blue-400"
        title="Bracket Visual Guide — After Results"
        subtitle="Once the admin enters a knockout result, the team name color and card border update to show how your pick compares to the actual outcome. Cards always have a dark background — color is communicated through text only."
      >
        <div className="space-y-2.5">
          {[
            {
              border:     '#22C55E',
              label:      '✓ Correct',
              labelColor: 'text-green-400',
              nameColor:  'text-green-400',
              nameLabel:  'GER',
              desc:       'Your pick won. Team name appears in green with a ✓ icon. Card gets a green border.',
            },
            {
              border:     '#f59e0b',
              label:      '↺ Different slot',
              labelColor: 'text-amber-400',
              nameColor:  'text-amber-400',
              nameLabel:  'FRA',
              desc:       'Your pick advanced — but through a different bracket slot than predicted. You still earn points. Team name in amber with a ↺ icon. Card gets an amber border.',
            },
            {
              border:     '#4B5563',
              label:      '✗ Wrong',
              labelColor: 'text-red-400',
              nameColor:  'text-red-400',
              nameLabel:  'RSA → GER',
              desc:       'Your pick was eliminated. Team name in red with a ✗ icon. The actual winner is shown in green beside it. Card border stays neutral.',
            },
            {
              border:     '#4B5563',
              label:      '● Pending',
              labelColor: 'text-gray-400',
              nameColor:  'text-gray-500',
              nameLabel:  'TUN',
              desc:       'Match not yet decided. The losing/non-picked team shows in gray-500. Status dots and pick arrow are used instead.',
            },
          ].map(({ border, label, labelColor, nameColor, nameLabel, desc }) => (
            <div
              key={label}
              className="flex items-start gap-3 rounded-lg border px-3 py-2.5 bg-gray-900"
              style={{ borderColor: border }}
            >
              <span className={`text-xs font-bold flex-shrink-0 mt-0.5 ${nameColor}`}>{nameLabel}</span>
              <div>
                <span className={`text-xs font-bold ${labelColor}`}>{label}</span>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 7. Grand Total ──────────────────────────────────────────────────── */}
      <div className="card bg-gray-900 border-yellow-700/40 space-y-3">
        <p className="text-xs font-semibold text-yellow-400 uppercase tracking-wider">Maximum Possible Points</p>
        <div className="space-y-2 text-sm">
          {[
            { label: 'Group stage match picks',     pts: 72 * SCORING.GROUP_EXACT_SCORE },
            { label: 'Group qualification bonus',   pts: 12 * SCORING.GROUP_QUALIFY_EXACT * 2 + 8 * SCORING.GROUP_QUALIFY_EXACT },
            { label: 'Knockout bracket picks',      pts: 16 * SCORING.PLAYOFF_R16 + 8 * SCORING.PLAYOFF_QF + 4 * SCORING.PLAYOFF_SF + SCORING.PLAYOFF_WINNER },
          ].map(({ label, pts }) => (
            <div key={label} className="flex justify-between">
              <span className="text-gray-400">{label}</span>
              <span className="font-semibold text-gray-300">{pts} pts</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-yellow-700/40 pt-2">
            <span className="font-bold text-white">Total</span>
            <span className="font-bold text-yellow-400 text-base">
              {72 * SCORING.GROUP_EXACT_SCORE
                + 12 * SCORING.GROUP_QUALIFY_EXACT * 2
                + 8  * SCORING.GROUP_QUALIFY_EXACT
                + 16 * SCORING.PLAYOFF_R16
                + 8  * SCORING.PLAYOFF_QF
                + 4  * SCORING.PLAYOFF_SF
                + SCORING.PLAYOFF_WINNER} pts
            </span>
          </div>
        </div>
      </div>

    </div>
  )
}
