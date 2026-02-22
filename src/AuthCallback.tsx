import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "./lib/supabase"

// SECTION: AuthCallback
export default function AuthCallback() {
  const navigate = useNavigate()
  const [msg, setMsg] = useState("Completing sign-in…")

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const url = new URL(window.location.href)
        const code = url.searchParams.get("code")

        // SECTION: PKCE code exchange
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            if (!cancelled) setMsg(`Auth error (exchangeCodeForSession): ${error.message}`)
            return
          }

          const { data: after } = await supabase.auth.getSession()
          if (!after.session) {
            if (!cancelled) setMsg("Signed in, but no session found after exchange. Try again.")
            return
          }

          if (!cancelled) setMsg("Signed in. Redirecting…")
          navigate("/", { replace: true })
          return
        }

        // SECTION: Fallback (hash/token style)
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          if (!cancelled) setMsg(`Session error: ${error.message}`)
          return
        }

        if (data.session) {
          if (!cancelled) setMsg("Signed in. Redirecting…")
          navigate("/", { replace: true })
          return
        }

        if (!cancelled) {
          setMsg("No code/session found. This link may be invalid or redirect URL is wrong.")
        }
      } catch (e: any) {
        if (!cancelled) setMsg(`Unexpected error: ${e?.message ?? String(e)}`)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [navigate])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="mx-auto max-w-xl px-4 py-10">
        <h1 className="text-2xl font-semibold">My Best Friend</h1>

        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="text-sm text-zinc-300">{msg}</div>

          <div className="mt-3 text-xs text-zinc-400">Current URL:</div>
          <pre className="mt-2 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-100">
            {window.location.href}
          </pre>
        </div>
      </div>
    </div>
  )
}