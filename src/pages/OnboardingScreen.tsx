import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabase"

// SECTION: Types
type OnboardingScreenProps = {
  onDone: () => void
}

// SECTION: OnboardingScreen
export default function OnboardingScreen({ onDone }: OnboardingScreenProps) {
  const [firstName, setFirstName] = useState("")
  const [timezone, setTimezone] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState<string>("")

  // SECTION: Default timezone
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    setTimezone(tz || "UTC")
  }, [])

  // SECTION: Timezone options
  const timezoneOptions = useMemo(() => {
    const base = [
      "UTC",
      "America/Denver",
      "America/Los_Angeles",
      "America/Chicago",
      "America/New_York",
    ]
    const current = timezone && !base.includes(timezone) ? [timezone, ...base] : base
    return Array.from(new Set(current))
  }, [timezone])

  // SECTION: Save profile
  const onContinue = async () => {
    setError("")
    setSuccess("")

    const cleanName = firstName.trim()
    if (!cleanName) {
      setError("First name is required.")
      return
    }

    const { data: auth, error: authError } = await supabase.auth.getUser()
    if (authError) {
      setError(authError.message)
      return
    }

    const userId = auth.user?.id
    if (!userId) {
      setError("No active session user found. Please sign out and sign in again.")
      return
    }

    setSaving(true)

    const { data, error: updateError, status } = await supabase
      .from("profiles")
      .update({
        first_name: cleanName,
        timezone: timezone || "UTC",
        onboarding_completed: true,
        onboarding_step: "done",
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select("*")
      .single()

    console.log("Onboarding update status:", status)
    console.log("Onboarding update error:", updateError)
    console.log("Onboarding update data:", data)

    if (updateError) {
      setSaving(false)
      setError(updateError.message)
      return
    }

    if (!data) {
      setSaving(false)
      setError("Update returned no data. Check RLS and table permissions.")
      return
    }

    setSaving(false)
    setSuccess("Saved. Loading your app…")
    onDone()
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="text-sm text-zinc-300">Onboarding</div>
      <div className="mt-1 text-lg font-semibold">Let’s set up your friend</div>

      <div className="mt-4 space-y-4">
        <div>
          <label className="text-sm text-zinc-300">First name</label>
          <input
            className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-50 outline-none"
            placeholder="Joseph"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
          />
        </div>

        <div>
          <label className="text-sm text-zinc-300">Timezone</label>
          <select
            className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-50 outline-none"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          >
            {timezoneOptions.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
          <div className="mt-2 text-xs text-zinc-400">
            (We’ll expand the timezone list later. For now this is enough to ship onboarding.)
          </div>
        </div>

        {error ? <div className="text-sm text-red-300">Error: {error}</div> : null}
        {success ? <div className="text-sm text-green-300">{success}</div> : null}

        <button
          className="w-full rounded-xl border border-zinc-800 bg-zinc-50 px-4 py-2 font-medium text-zinc-900 disabled:opacity-50"
          onClick={onContinue}
          disabled={saving}
        >
          {saving ? "Saving…" : "Continue"}
        </button>
      </div>
    </div>
  )
}