import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/hooks/useAuth'

// Layout
import Header from '@/components/Layout/Header'

// Auth pages
import LoginPage from '@/components/Auth/LoginPage'
import RegisterPage from '@/components/Auth/RegisterPage'

// Home
import HomePage from '@/components/Home/HomePage'

// F1 Survivor
import F1SurvivorLayout from '@/components/F1Survivor/F1SurvivorLayout'
import PickSubmissionPage from '@/components/F1Survivor/PickSubmission/PickSubmissionPage'
import LeaderboardPage from '@/components/F1Survivor/Leaderboard/LeaderboardPage'
import HistoryPage from '@/components/F1Survivor/History/HistoryPage'
import GroupsPage from '@/components/F1Survivor/Groups/GroupsPage'
import RaceResultsAdmin from '@/components/F1Survivor/Admin/RaceResultsAdmin'

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
          <Route path="admin" element={<RaceResultsAdmin />} />
        </Route>

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
