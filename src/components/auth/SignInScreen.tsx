import { useState } from "react"
import { supabase } from "../../lib/supabase"

export default function SignInScreen() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle")
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !trimmed.includes("@")) {
      setError("Please enter a valid email address.")
      return
    }
    setError(null)
    setStatus("sending")
    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (authError) {
        setError(authError.message)
        setStatus("idle")
        return
      }
      setStatus("sent")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again."
      setError(message)
      setStatus("idle")
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-xl">
            🤝
          </div>
          <h1 className="text-2xl font-semibold text-zinc-50">My Best Friend</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Your calm, memory-aware AI companion.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-sm">
          {status === "sent" ? (
            <div className="text-center">
              <div className="mb-3 text-3xl">📬</div>
              <h2 className="text-base font-semibold text-zinc-100">Check your inbox</h2>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                We sent a magic link to{" "}
                <span className="font-medium text-zinc-200">{email}</span>. Click it to sign in.
              </p>
              <button
                onClick={() => { setStatus("idle"); setEmail("") }}
                className="mt-5 text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-300 transition"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-medium text-zinc-300"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null) }}
                  disabled={status === "sending"}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-50 outline-none placeholder:text-zinc-600 transition focus:border-zinc-500 disabled:opacity-50"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={status === "sending" || !email.trim()}
                className="w-full rounded-xl bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-900 transition hover:opacity-90 active:opacity-80 disabled:opacity-40"
              >
                {status === "sending" ? "Sending link…" : "Continue with Magic Link"}
              </button>

              <p className="text-center text-xs text-zinc-500 leading-relaxed">
                No password needed. We'll send a secure link to your inbox.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
