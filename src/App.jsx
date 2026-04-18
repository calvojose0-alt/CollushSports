import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/hooks/useAuth'

// Layout
import Header from '@/components/Layout/Header'

// Auth pages
import LoginPage from '@/components/Auth/LoginPage'
import RegisterPage from '@/components/Auth/RegisterPage'

// Home
import HomePage from '@/components/Home/HomePage'

// Profile
import ProfilePage from '@/components/Profile/ProfilePage'

// Site Admin
import SiteAdminPage from '@/components/Admin/SiteAdminPage'

// Group invite join
import JoinGroupPage from '@/components/Groups/JoinGroupPage'

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
      <div className="min-h-[calc(100vh-56px)]">{children}</div>
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
          <Route path="admin" element={<AdminRoute fallback="/world-cup"><WCAdminPage /></AdminRoute>} />
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
