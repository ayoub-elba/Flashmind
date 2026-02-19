import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProjectProvider } from './contexts/ProjectContext'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import { Loader2, Brain, Clock, LogOut } from 'lucide-react'

function PendingApproval() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25 mb-6">
          <Clock className="w-8 h-8 text-white" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Account Pending Approval</h1>
        <p className="text-slate-400 mb-6">
          Your account <span className="text-white font-medium">{user?.email}</span> has been created successfully.
          An administrator needs to approve your account before you can access FlashMind.
        </p>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
          <p className="text-sm text-amber-400">
            You will be able to sign in once your account is approved. Please check back later.
          </p>
        </div>

        <button
          onClick={signOut}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  )
}

function AppContent() {
  const { user, loading, approved } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    )
  }

  if (!user) return <Auth />

  // User is logged in but not yet approved
  if (approved === false) return <PendingApproval />

  // User is approved (or approval status still loading)
  if (approved === true) {
    return (
      <ProjectProvider>
        <Dashboard />
      </ProjectProvider>
    )
  }

  // Still checking approval
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
