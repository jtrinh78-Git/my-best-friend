import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "./lib/supabase"

type CallbackStatus = "pending" | "success" | "error"

export default function AuthCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<CallbackStatus>("pending")
  const [message, setMessage] = useState("Completing sign-in…")

  useEffect(() => {
    let cancelled = false

    const handleCallback = async () => {
      try {
        const url = new URL(window.location.href)
        const code = url.searchParams.get("code")

        // PKCE code exchange
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            if (!cancelled) {
              setStatus("error")
              setMessage(`Authentication failed: ${error.message}`)
            }
            return
          }

          const { data: after } = await supabase.auth.getSession()
          if (!after.session) {
            if (!cancelled) {
              setStatus("error")
              setMessage("Signed in, but no session was found. Please try again.")
            }
            return
          }

          if (!cancelled) {
            setStatus("success")
            setMessage("Signed in. Redirecting…")
            navigate("/", { replace: true })
          }
          return
        }

        // Fallback: check existing session
        const { data, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) {
          if (!cancelled) {
            setStatus("error")
            setMessage(`Session error: ${sessionError.message}`)
          }
          return
        }

        if (data.session) {
          if (!cancelled) {
            setStatus("success")
            setMessage("Signed in. Redirecting…")
            navigate("/", { replace: true })
          }
          return
        }

        if (!cancelled) {
          setStatus("error")
          setMessage("No sign-in code or session found. This link may be invalid or expired.")
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "An unexpected error occurred."
          setStatus("error")
          setMessage(msg)
        }
      }
    }

    handleCallback()
    return () => { cancelled = true }
  }, [navigate])

  const statusColor: Record<CallbackStatus, string> = {
    pending: "text-zinc-300",
    success: "text-emerald-300",
    error: "text-red-300",
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-xl">
            🤝
          </div>
          <h1 className="text-2xl font-semibold text-zinc-50">My Best Friend</h1>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <p className={`text-sm ${statusColor[status]}`}>{message}</p>

          {status === "error" && (
            <div className="mt-4">
              <a
                href="/"
                className="inline-block rounded-xl border border-zinc-700 px-4 py-2 text-xs text-zinc-300 transition hover:bg-zinc-800"
              >
                Back to home
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
