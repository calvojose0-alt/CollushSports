import { Star, Flag, Medal, Trophy, Target } from 'lucide-react'
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
        <h2 className="font-bold text-blue-800 text-lg">How Scoring Works</h2>
      </div>
      <p className="text-sm text-gray-400 -mt-3">
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

      {/* ── 5. Grand Total ──────────────────────────────────────────────────── */}
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
