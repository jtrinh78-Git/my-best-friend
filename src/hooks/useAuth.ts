import { useEffect, useState } from "react"
import type { Session } from "@supabase/supabase-js"
import { supabase } from "../lib/supabase"
import type { Profile } from "../types"

interface AuthState {
  session: Session | null
  profile: Profile | null
  loading: boolean
  error: string | null
  refreshProfile: () => void
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Listen to auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setRefreshKey((k) => k + 1)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  // Fetch profile whenever session or refreshKey changes
  useEffect(() => {
    let cancelled = false

    const fetchProfile = async () => {
      const uid = session?.user?.id
      if (!uid) {
        if (!cancelled) {
          setProfile(null)
          setLoading(false)
        }
        return
      }

      try {
        setLoading(true)
        setError(null)

        const { data, error: fetchError } = await supabase
          .from("profiles")
          .select(
            "id, first_name, timezone, default_friend_name, onboarding_completed, onboarding_step, created_at, updated_at"
          )
          .eq("id", uid)
          .single()

        if (fetchError) throw fetchError
        if (!cancelled) setProfile(data as Profile)
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load profile."
          setError(message)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchProfile()
    return () => { cancelled = true }
  }, [session, refreshKey])

  const refreshProfile = () => setRefreshKey((k) => k + 1)

  return { session, profile, loading, error, refreshProfile }
}
