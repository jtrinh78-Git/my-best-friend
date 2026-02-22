import { useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "../lib/supabase"
import { ChatMessage, getFriendReply } from "../lib/chat"

// SECTION: Types
type Conversation = {
  id: string
  title: string
  created_at: string
  updated_at: string
}

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
  const [status, setStatus] = useState<"online" | "typing">("online")
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [activeConversationTitle, setActiveConversationTitle] = useState<string>("My Best Friend")

  const canSend = useMemo(() => input.trim().length > 0, [input])
  const scrollerRef = useRef<HTMLDivElement | null>(null)

  // SECTION: Ensure active conversation (fetch or create)
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

      // 1) Fetch conversations
      const { data: convs, error: convErr } = await supabase
        .from("conversations")
        .select("id, title, created_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(1)

      if (cancelled) return

      if (convErr) {
        setError(convErr.message)
        setLoading(false)
        return
      }

      // 2) Pick first, or create one
      let active: Conversation | null = (convs?.[0] as Conversation) ?? null

      if (!active) {
        const { data: created, error: createErr } = await supabase
          .from("conversations")
          .insert({ user_id: userId, title: "My Best Friend" })
          .select("id, title, created_at, updated_at")
          .single()

        if (cancelled) return

        if (createErr) {
          setError(createErr.message)
          setLoading(false)
          return
        }

        active = created as Conversation
      }

      setActiveConversationId(active.id)
      setActiveConversationTitle(active.title)

      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [])

  // SECTION: Load messages for active conversation
  useEffect(() => {
    const convId = activeConversationId
    if (!convId) return

    let cancelled = false

    ;(async () => {
      setLoading(true)
      setError("")

      const { data, error: fetchErr } = await supabase
        .from("messages")
        .select("id, role, text, created_at")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true })

      if (cancelled) return

      if (fetchErr) {
        setError(fetchErr.message)
        setLoading(false)
        return
      }

      const rows = data ?? []
      const mapped = rows.map(toChatMessage)

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
  }, [activeConversationId])

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

    const convId = activeConversationId
    if (!convId) throw new Error("No active conversation found.")

    const { data, error: insertErr } = await supabase
      .from("messages")
      .insert({ user_id: userId, conversation_id: convId, role, text })
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

    const optimisticUserMsg: ChatMessage = {
      id: `local-u-${Date.now()}`,
      role: "user",
      text,
      ts: Date.now(),
    }
    setMessages((prev) => [...prev, optimisticUserMsg])

    try {
      const savedUser = await insertMessage("user", text)
      setMessages((prev) => prev.map((m) => (m.id === optimisticUserMsg.id ? savedUser : m)))

      setStatus("typing")

      const historySnapshot = [...messages.filter((m) => !m.id.startsWith("local-")), savedUser]
      const replyText = await getFriendReply(historySnapshot, text)

      const savedFriend = await insertMessage("friend", replyText)
      setMessages((prev) => [...prev, savedFriend])

      // bump conversation updated_at (so it stays most recent)
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", activeConversationId)
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
          <div className="text-sm text-zinc-300">{activeConversationTitle}</div>
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
          <div className="text-sm text-zinc-300">Loading…</div>
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
            disabled={loading || !activeConversationId}
          />
          <button
            className="rounded-xl border border-zinc-800 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50"
            disabled={!canSend || loading || !activeConversationId}
            onClick={send}
          >
            Send
          </button>
        </div>

        <div className="mt-2 text-xs text-zinc-500">
          (Now using conversations. Next we’ll add switching + “New chat”.)
        </div>
      </div>
    </div>
  )
}