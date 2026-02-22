import { useEffect, useState } from "react"
import { supabase } from "./lib/supabase"
import MainApp from "./pages/MainApp"
import OnboardingScreen from "./pages/OnboardingScreen"

// SECTION: App
export default function App() {
  const [sessionEmail, setSessionEmail] = useState<string | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [profileRefreshKey, setProfileRefreshKey] = useState(0)

  // SECTION: Auth session
  useEffect(() => {
    let unsub: any = null

    supabase.auth.getSession().then(({ data }) => {
      setSessionEmail(data.session?.user?.email ?? null)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user?.email ?? null)
      // When auth changes, refetch profile
      setProfileRefreshKey((k) => k + 1)
    })

    unsub = data?.subscription

    return () => {
      unsub?.unsubscribe?.()
    }
  }, [])

  // SECTION: Fetch profile
  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        setProfileLoading(true)
        setProfileError(null)

        const { data: sessionData } = await supabase.auth.getSession()
        const uid = sessionData.session?.user?.id
        if (!uid) {
          if (!cancelled) {
            setProfile(null)
            setProfileLoading(false)
          }
          return
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("id, first_name, timezone, default_friend_name, onboarding_completed, onboarding_step, created_at, updated_at")
          .eq("id", uid)
          .single()

        if (error) throw error
        if (!cancelled) setProfile(data)
      } catch (e: any) {
        if (!cancelled) setProfileError(e?.message ?? "Failed to load profile.")
      } finally {
        if (!cancelled) setProfileLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [profileRefreshKey])

  // SECTION: Sign out
  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-3xl font-semibold text-zinc-50">My Best Friend</h1>

      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-zinc-300">Signed in as</div>
            <div className="font-medium text-zinc-100">{sessionEmail ?? "Unknown email"}</div>
          </div>

          <button
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-100"
            onClick={signOut}
          >
            Sign out
          </button>
        </div>

        {profileLoading ? (
          <div className="mt-6 text-sm text-zinc-300">Loading…</div>
        ) : profileError ? (
          <div className="mt-6 text-sm text-red-300">Error: {profileError}</div>
        ) : profile?.onboarding_completed ? (
          <div className="mt-6">
            <MainApp />
          </div>
        ) : (
          <div className="mt-6">
            <OnboardingScreen onDone={() => setProfileRefreshKey((k) => k + 1)} />
          </div>
        )}
      </div>
    </div>
  )
}