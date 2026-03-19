import { useAuth } from "./hooks/useAuth"
import SignInScreen from "./components/auth/SignInScreen"
import MainApp from "./pages/MainApp"
import OnboardingScreen from "./pages/OnboardingScreen"
import { Skeleton } from "./components/ui/Skeleton"
import { supabase } from "./lib/supabase"

// ─── Full-page loading shell ─────────────────────────────────────────────────
function AppLoadingShell() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
        <div className="mt-6">
          <Skeleton className="h-[calc(100vh-170px)] w-full rounded-2xl" />
        </div>
      </div>
    </div>
  )
}

// ─── App shell (authenticated) ───────────────────────────────────────────────
function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-3xl font-semibold tracking-tight">My Best Friend</h1>
          </div>
          <button
            className="shrink-0 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-100 transition hover:bg-zinc-900 active:opacity-80"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}

// ─── Root App ────────────────────────────────────────────────────────────────
export default function App() {
  const { session, profile, loading, error, refreshProfile } = useAuth()

  // 1. Loading — show skeleton
  if (loading) return <AppLoadingShell />

  // 2. Not authenticated — show sign-in screen
  if (!session) return <SignInScreen />

  // 3. Profile error
  if (error) {
    return (
      <AuthenticatedShell>
        <div className="rounded-2xl border border-red-900/60 bg-red-950/30 p-5 text-sm text-red-200">
          <p className="font-semibold">Something went wrong</p>
          <p className="mt-1 opacity-80">{error}</p>
          <button
            onClick={refreshProfile}
            className="mt-3 rounded-xl border border-red-800 px-4 py-2 text-xs text-red-200 hover:bg-red-950/50 transition"
          >
            Try again
          </button>
        </div>
      </AuthenticatedShell>
    )
  }

  // 4. Onboarding not completed
  if (!profile?.onboarding_completed) {
    return (
      <AuthenticatedShell>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <OnboardingScreen onDone={refreshProfile} />
        </div>
      </AuthenticatedShell>
    )
  }

  // 5. Fully authenticated + onboarded
  return (
    <AuthenticatedShell>
      <div className="h-[calc(100vh-130px)]">
        <MainApp />
      </div>
    </AuthenticatedShell>
  )
}
