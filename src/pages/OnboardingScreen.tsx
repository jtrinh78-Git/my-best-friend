import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabase"

interface OnboardingScreenProps {
  onDone: () => void
}

const BASE_TIMEZONES = [
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
]

export default function OnboardingScreen({ onDone }: OnboardingScreenProps) {
  const [firstName, setFirstName] = useState("")
  const [timezone, setTimezone] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>("")

  // Auto-detect timezone
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    setTimezone(tz || "UTC")
  }, [])

  const timezoneOptions = useMemo(() => {
    const all = timezone && !BASE_TIMEZONES.includes(timezone)
      ? [timezone, ...BASE_TIMEZONES]
      : BASE_TIMEZONES
    return Array.from(new Set(all))
  }, [timezone])

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
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
      setError("No active session. Please sign out and sign in again.")
      return
    }

    setSaving(true)
    try {
      const { data, error: updateError } = await supabase
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

      if (updateError) throw updateError
      if (!data) throw new Error("Update returned no data. Check RLS and table permissions.")

      onDone()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again."
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm py-4">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Setup</p>
        <h2 className="mt-1 text-xl font-semibold text-zinc-100">Let's set up your friend</h2>
        <p className="mt-1.5 text-sm text-zinc-400">
          Just two quick things to personalize your experience.
        </p>
      </div>

      <form onSubmit={handleContinue} className="flex flex-col gap-5">
        <div>
          <label htmlFor="firstName" className="mb-1.5 block text-sm font-medium text-zinc-300">
            Your first name
          </label>
          <input
            id="firstName"
            type="text"
            autoComplete="given-name"
            autoFocus
            placeholder="e.g. Joseph"
            value={firstName}
            onChange={(e) => { setFirstName(e.target.value); setError("") }}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-50 outline-none placeholder:text-zinc-600 transition focus:border-zinc-500"
          />
        </div>

        <div>
          <label htmlFor="timezone" className="mb-1.5 block text-sm font-medium text-zinc-300">
            Your timezone
          </label>
          <select
            id="timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-50 outline-none transition focus:border-zinc-500"
          >
            {timezoneOptions.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-zinc-600">
            Used for reminders and scheduling. Auto-detected from your browser.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-900/60 bg-red-950/30 px-3 py-2.5 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving || !firstName.trim()}
          className="w-full rounded-xl bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-900 transition hover:opacity-90 active:opacity-80 disabled:opacity-40"
        >
          {saving ? "Saving…" : "Continue"}
        </button>
      </form>
    </div>
  )
}
