import { useEffect, useMemo, useState } from "react"
import { supabase } from "./lib/supabase"
import OnboardingScreen from "./pages/OnboardingScreen"
import MainApp from "./pages/MainApp"
// SECTION: Types
type Profile = {
  id: string
  first_name: string
  timezone: string | null
  default_friend_name: string | null
  onboarding_completed: boolean
  onboarding_step: string | null
  created_at: string
  updated_at: string
}

export default function App() {
  // SECTION: State
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<string>("")
  const [session, setSession] = useState<any>(null)
  const [sessionEmail, setSessionEmail] = useState<string | null>(null)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  // SECTION: Auth session bootstrap + listener
  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return
      if (error) {
        setStatus(error.message)
        setSession(null)
        setSessionEmail(null)
        return
      }
      setSession(data.session ?? null)
      setSessionEmail(data.session?.user?.email ?? null)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null)
      setSessionEmail(nextSession?.user?.email ?? null)
      setStatus("")
    })

    return () => {
      mounted = false
      sub?.subscription?.unsubscribe()
    }
  }, [])

  // SECTION: Fetch profile for current session user
  useEffect(() => {
    const userId = session?.user?.id as string | undefined
    if (!userId) {
      setProfile(null)
      setProfileError(null)
      setProfileLoading(false)
      return
    }

    let cancelled = false

    ;(async () => {
      setProfileLoading(true)
      setProfileError(null)

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single()

      if (cancelled) return

      if (error) {
        setProfile(null)
        setProfileError(error.message)
        setProfileLoading(false)
        return
      }

      setProfile((data as Profile) ?? null)
      setProfileLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [session?.user?.id])

  // SECTION: Actions
  const canSendMagicLink = useMemo(() => email.trim().length > 3, [email])

  const signInWithMagicLink = async () => {
    setStatus("")
    const cleanEmail = email.trim()
    if (!cleanEmail) return

    const redirectTo = `${window.location.origin}/auth/callback`

    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: { emailRedirectTo: redirectTo },
    })

    if (error) {
      setStatus(error.message)
      return
    }

    setStatus("Magic link sent. Check your email.")
  }

  const signOut = async () => {
    setStatus("")
    const { error } = await supabase.auth.signOut()
    if (error) setStatus(error.message)
  }

  // SECTION: UI
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold">My Best Friend</h1>

        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          {!session ? (
            <>
              <div className="text-sm text-zinc-300">Sign in (magic link)</div>

              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <input
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-50 outline-none"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button
                  className="rounded-xl border border-zinc-800 bg-zinc-50 px-4 py-2 text-zinc-900 disabled:opacity-50"
                  onClick={signInWithMagicLink}
                  disabled={!canSendMagicLink}
                >
                  Send link
                </button>
              </div>

              {status ? <div className="mt-3 text-sm text-zinc-300">{status}</div> : null}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm text-zinc-300">Signed in as</div>
                  <div className="font-medium">{sessionEmail ?? "Unknown email"}</div>
                </div>

                <button
                  className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-zinc-50"
                  onClick={signOut}
                >
                  Sign out
                </button>
              </div>

              <div className="mt-6 space-y-4">
  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
    <div className="text-sm text-zinc-300">Profile fetch result</div>

    {profileLoading ? (
      <div className="mt-2 text-sm text-zinc-300">Loading profile…</div>
    ) : profileError ? (
      <div className="mt-2 text-sm text-red-300">Error: {profileError}</div>
    ) : (
      <pre className="mt-3 overflow-auto rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-xs text-zinc-100">
        {JSON.stringify(profile, null, 2)}
      </pre>
    )}
  </div>

  {profileLoading ? null : profileError ? null : profile?.onboarding_completed ? (
    <MainApp />
  ) : (
    <OnboardingScreen />
  )}
</div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}