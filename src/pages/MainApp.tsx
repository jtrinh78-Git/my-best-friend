import { useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "../lib/supabase"
import { ChatMessage, getFriendReply } from "../lib/chat"

// SECTION: Helpers
function toChatMessage(row: any): ChatMessage {
  return {
    id: row.id,
    role: row.role,
    text: row.text,
    ts: new Date(row.created_at).getTime(),
  }
}

// SECTION: MainApp
export default function MainApp() {
  const [friendName] = useState("My Best Friend")
  const [status, setStatus] = useState<"online" | "typing">("online")
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")

  const canSend = useMemo(() => input.trim().length > 0, [input])
  const scrollerRef = useRef<HTMLDivElement | null>(null)

  // SECTION: Load messages (per-user)
  useEffect(() => {
    let cancelled = false

    ;(async () => {
      setLoading(true)
      setError("")

      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession()
      if (sessionErr) {
        if (!cancelled) setError(sessionErr.message)
        if (!cancelled) setLoading(false)
        return
      }

      const userId = sessionData.session?.user?.id
      if (!userId) {
        if (!cancelled) setError("No active session found. Please sign in again.")
        if (!cancelled) setLoading(false)
        return
      }

      const { data, error: fetchErr } = await supabase
        .from("messages")
        .select("id, role, text, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })

      if (cancelled) return

      if (fetchErr) {
        setError(fetchErr.message)
        setLoading(false)
        return
      }

      const rows = data ?? []
      const mapped = rows.map(toChatMessage)

      // If no history yet, seed a first friend message locally (NOT inserted)
      if (mapped.length === 0) {
        setMessages([
          {
            id: "seed-1",
            role: "friend",
            text: "Hey Joseph — I’m here. What do you want to focus on today?",
            ts: Date.now(),
          },
        ])
      } else {
        setMessages(mapped)
      }

      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [])

  // SECTION: Auto-scroll
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages.length])

  // SECTION: Insert message row
  const insertMessage = async (role: "user" | "friend", text: string) => {
    const { data: sessionData } = await supabase.auth.getSession()
    const userId = sessionData.session?.user?.id
    if (!userId) throw new Error("No active session found.")

    const { data, error: insertErr } = await supabase
      .from("messages")
      .insert({ user_id: userId, role, text })
      .select("id, role, text, created_at")
      .single()

    if (insertErr) throw insertErr
    return toChatMessage(data)
  }

  // SECTION: Send message
  const send = async () => {
    const text = input.trim()
    if (!text) return

    setInput("")
    setError("")

    // Optimistic UI (temporary local id)
    const optimisticUserMsg: ChatMessage = {
      id: `local-u-${Date.now()}`,
      role: "user",
      text,
      ts: Date.now(),
    }
    setMessages((prev) => [...prev, optimisticUserMsg])

    try {
      // Persist user message (replace optimistic)
      const savedUser = await insertMessage("user", text)
      setMessages((prev) => prev.map((m) => (m.id === optimisticUserMsg.id ? savedUser : m)))

      setStatus("typing")

      // Use history snapshot that includes saved user message
      const historySnapshot = [...messages.filter((m) => !m.id.startsWith("local-")), savedUser]
      const replyText = await getFriendReply(historySnapshot, text)

      // Persist friend reply (then render)
      const savedFriend = await insertMessage("friend", replyText)
      setMessages((prev) => [...prev, savedFriend])
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.")
    } finally {
      setStatus("online")
    }
  }

  return (
    <div className="min-h-[calc(100vh-140px)] rounded-2xl border border-zinc-800 bg-zinc-950">
      {/* SECTION: Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div>
          <div className="text-sm text-zinc-300">{friendName}</div>
          <div className="mt-0.5 text-xs text-zinc-400">
            {status === "online" ? "Online" : "Typing…"}{" "}
            <span className="inline-block translate-y-[1px] text-green-400">●</span>
          </div>
        </div>

        <button
          className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          onClick={() => alert("Settings (later)")}
        >
          Settings
        </button>
      </div>

      {/* SECTION: Body */}
      <div
        ref={scrollerRef}
        className="h-[calc(100vh-140px-56px-84px)] overflow-y-auto px-4 py-4"
      >
        {loading ? (
          <div className="text-sm text-zinc-300">Loading messages…</div>
        ) : error ? (
          <div className="text-sm text-red-300">Error: {error}</div>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => (
              <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={[
                    "max-w-[80%] rounded-2xl border px-3 py-2 text-sm",
                    m.role === "user"
                      ? "border-zinc-700 bg-zinc-50 text-zinc-900"
                      : "border-zinc-800 bg-zinc-900/40 text-zinc-100",
                  ].join(" ")}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION: Input */}
      <div className="border-t border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-50 outline-none"
            placeholder="Message…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send()
            }}
            disabled={loading}
          />
          <button
            className="rounded-xl border border-zinc-800 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50"
            disabled={!canSend || loading}
            onClick={send}
          >
            Send
          </button>
        </div>

        <div className="mt-2 text-xs text-zinc-500">
          (Now persists in Supabase. Refresh the page to confirm history stays.)
        </div>
      </div>
    </div>
  )
}