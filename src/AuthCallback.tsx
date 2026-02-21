import { useEffect } from "react"
import { supabase } from "./lib/supabase"

export default function AuthCallback() {
  useEffect(() => {
    supabase.auth.getSession().then(() => {
      window.location.href = "/"
    })
  }, [])

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-sm text-white/60">Signing you in...</div>
    </div>
  )
}