import { HashRouter as BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/hooks/useAuth'

// Layout
import Header from '@/components/Layout/Header'

// Auth pages
import LoginPage from '@/components/Auth/LoginPage'
import RegisterPage from '@/components/Auth/RegisterPage'
import ForgotPasswordPage from '@/components/Auth/ForgotPasswordPage'
import ResetPasswordPage from '@/components/Auth/ResetPasswordPage'

// Home
import HomePage from '@/components/Home/HomePage'

// Profile
import ProfilePage from '@/components/Profile/ProfilePage'

// Site Admin
import SiteAdminPage from '@/components/Admin/SiteAdminPage'

// Group invite join
import JoinGroupPage from '@/components/Groups/JoinGroupPage'

// Support
import SupportPage from '@/components/Support/SupportPage'

// F1 Survivor
import F1SurvivorLayout from '@/components/F1Survivor/F1SurvivorLayout'
import PickSubmissionPage from '@/components/F1Survivor/PickSubmission/PickSubmissionPage'
import LeaderboardPage from '@/components/F1Survivor/Leaderboard/LeaderboardPage'
import HistoryPage from '@/components/F1Survivor/History/HistoryPage'
import GroupsPage from '@/components/F1Survivor/Groups/GroupsPage'
import RaceResultsAdmin from '@/components/F1Survivor/Admin/RaceResultsAdmin'

// World Cup Quiniela
import WorldCupLayout from '@/components/WorldCup/WorldCupLayout'
import MyPicksPage from '@/components/WorldCup/Picks/MyPicksPage'
import BracketPage from '@/components/WorldCup/Bracket/BracketPage'
import WCLeaderboardPage from '@/components/WorldCup/Leaderboard/WCLeaderboardPage'
import WCGroupsPage from '@/components/WorldCup/Groups/WCGroupsPage'
import WCAdminPage from '@/components/WorldCup/Admin/WCAdminPage'
import WCScoringPage from '@/components/WorldCup/Scoring/WCScoringPage'

// Soccer Win League
import WinLeagueLayout from '@/components/WinLeague/WinLeagueLayout'
import DraftPage from '@/components/WinLeague/Draft/DraftPage'
import MyTeamsPage from '@/components/WinLeague/Teams/MyTeamsPage'
import WLLeaderboardPage from '@/components/WinLeague/Leaderboard/WLLeaderboardPage'
import WLAdminPage from '@/components/WinLeague/Admin/WLAdminPage'

// Pro Football Win League
import FootballWinLeagueLayout from '@/components/FootballWinLeague/FootballWinLeagueLayout'
import FWLDraftPage from '@/components/FootballWinLeague/Draft/DraftPage'
import FWLMyTeamsPage from '@/components/FootballWinLeague/Teams/MyTeamsPage'
import FWLLeaderboardPage from '@/components/FootballWinLeague/Leaderboard/LeaderboardPage'
import FWLAdminPage from '@/components/FootballWinLeague/Admin/AdminPage'

// NFL Fantasy Manager League
import NflManagerLayout from '@/components/NflManager/NflManagerLayout'
import LeagueHubPage from '@/components/NflManager/Hub/LeagueHubPage'
import CreateLeaguePage from '@/components/NflManager/Hub/CreateLeaguePage'
import JoinLeaguePage from '@/components/NflManager/Hub/JoinLeaguePage'
import MyTeamPage from '@/components/NflManager/Team/MyTeamPage'
import SetLineupPage from '@/components/NflManager/Lineup/SetLineupPage'
import MarketPage from '@/components/NflManager/Market/MarketPage'
import NflStandingsPage from '@/components/NflManager/Standings/StandingsPage'
import CommissionerPage from '@/components/NflManager/Admin/CommissionerPage'

const ADMIN_EMAIL = 'jcalvo87@hotmail.com'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-2 border-f1red border-t-transparent rounded-full" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AdminRoute({ children, fallback = '/f1-survivor' }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-2 border-f1red border-t-transparent rounded-full" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  if (user.email?.toLowerCase() !== ADMIN_EMAIL) return <Navigate to={fallback} replace />
  return children
}

function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-200">
      <Header />
      <div className="min-h-[calc(100vh-56px)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>{children}</div>
    </div>
  )
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout>
                <HomePage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* Profile */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <AppLayout>
                <ProfilePage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* F1 Survivor nested routes */}
        <Route
          path="/f1-survivor"
          element={
            <ProtectedRoute>
              <AppLayout>
                <F1SurvivorLayout />
              </AppLayout>
            </ProtectedRoute>
          }
        >
          <Route index element={<PickSubmissionPage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="groups" element={<GroupsPage />} />
          <Route path="admin" element={<AdminRoute><RaceResultsAdmin /></AdminRoute>} />
        </Route>

        {/* World Cup Quiniela nested routes */}
        <Route
          path="/world-cup"
          element={
            <ProtectedRoute>
              <AppLayout>
                <WorldCupLayout />
              </AppLayout>
            </ProtectedRoute>
          }
        >
          <Route index element={<MyPicksPage />} />
          <Route path="bracket" element={<BracketPage />} />
          <Route path="leaderboard" element={<WCLeaderboardPage />} />
          <Route path="groups" element={<WCGroupsPage />} />
          <Route path="scoring" element={<WCScoringPage />} />
          <Route path="admin" element={<AdminRoute fallback="/world-cup"><WCAdminPage /></AdminRoute>} />
        </Route>

        {/* Soccer Win League nested routes */}
        <Route
          path="/win-league"
          element={
            <ProtectedRoute>
              <AppLayout>
                <WinLeagueLayout />
              </AppLayout>
            </ProtectedRoute>
          }
        >
          <Route index element={<DraftPage />} />
          <Route path="my-teams" element={<MyTeamsPage />} />
          <Route path="leaderboard" element={<WLLeaderboardPage />} />
          <Route path="admin" element={<AdminRoute fallback="/win-league"><WLAdminPage /></AdminRoute>} />
        </Route>

        {/* Pro Football Win League nested routes */}
        <Route
          path="/football-win-league"
          element={
            <ProtectedRoute>
              <AppLayout>
                <FootballWinLeagueLayout />
              </AppLayout>
            </ProtectedRoute>
          }
        >
          <Route index element={<FWLDraftPage />} />
          <Route path="my-teams" element={<FWLMyTeamsPage />} />
          <Route path="leaderboard" element={<FWLLeaderboardPage />} />
          <Route path="admin" element={<AdminRoute fallback="/football-win-league"><FWLAdminPage /></AdminRoute>} />
        </Route>

        {/* NFL Fantasy Manager League */}
        <Route
          path="/nfl-manager"
          element={
            <ProtectedRoute>
              <AppLayout>
                <LeagueHubPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/nfl-manager/create"
          element={
            <ProtectedRoute>
              <AppLayout>
                <CreateLeaguePage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/nfl-manager/join/:code"
          element={
            <ProtectedRoute>
              <AppLayout>
                <JoinLeaguePage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/nfl-manager/:leagueId"
          element={
            <ProtectedRoute>
              <AppLayout>
                <NflManagerLayout />
              </AppLayout>
            </ProtectedRoute>
          }
        >
          <Route index element={<MyTeamPage />} />
          <Route path="lineup" element={<SetLineupPage />} />
          <Route path="market" element={<MarketPage />} />
          <Route path="standings" element={<NflStandingsPage />} />
          <Route path="commissioner" element={<CommissionerPage />} />
        </Route>

        {/* Site Admin dashboard */}
        <Route
          path="/admin"
          element={
            <AdminRoute fallback="/">
              <AppLayout>
                <SiteAdminPage />
              </AppLayout>
            </AdminRoute>
          }
        />

        {/* Group invite link — public, works for both logged-in and new users */}
        <Route path="/join/:code" element={<JoinGroupPage />} />

        {/* Support page — public, no auth required */}
        <Route path="/support" element={<SupportPage />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
