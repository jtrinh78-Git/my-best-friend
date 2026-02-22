import { useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "../lib/supabase"
import { ChatMessage, getFriendReply, updateConversationTitle } from "../lib/chat"
import {
  deriveConversationTitleFromFirstMessage,
  isDefaultConversationTitle,
} from "../lib/conversationTitles"
import Sidebar from "../components/Sidebar"

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

function formatTime(ts: number) {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(ts))
  } catch {
    const d = new Date(ts)
    const hh = String(d.getHours())
    const mm = String(d.getMinutes()).padStart(2, "0")
    return `${hh}:${mm}`
  }
}

function startOfDay(ts: number) {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function formatDayLabel(dayStartTs: number) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yStart = todayStart - 24 * 60 * 60 * 1000

  if (dayStartTs === todayStart) return "Today"
  if (dayStartTs === yStart) return "Yesterday"

  try {
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(dayStartTs))
  } catch {
    const d = new Date(dayStartTs)
    return `${d.getMonth() + 1}/${d.getDate()}`
  }
}

// SECTION: TypingBubble
function TypingBubble() {
  return (
    <div className="flex justify-start mt-4">
      <div className="items-start">
        <div className="max-w-[520px] rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-zinc-500 animate-bounce [animation-delay:-0.2s]" />
            <span className="h-2 w-2 rounded-full bg-zinc-500 animate-bounce [animation-delay:-0.1s]" />
            <span className="h-2 w-2 rounded-full bg-zinc-500 animate-bounce" />
          </div>
        </div>
        <div className="mt-1 text-[11px] text-zinc-500">Typing…</div>
      </div>
    </div>
  )
}

// SECTION: MainApp
export default function MainApp() {
  const [status, setStatus] = useState<"online" | "typing">("online")
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [activeConversationTitle, setActiveConversationTitle] = useState<string>("My Best Friend")

  const canSend = useMemo(() => input.trim().length > 0, [input])
  const canSendNow = useMemo(() => canSend && !loading && !!activeConversationId && status !== "typing", [
    canSend,
    loading,
    activeConversationId,
    status,
  ])

  const scrollerRef = useRef<HTMLDivElement | null>(null)

  const isEmptyChat = useMemo(() => !messages.some((m) => m.role === "user"), [messages])

  // SECTION: Session helper
  const getUserId = async () => {
    const { data } = await supabase.auth.getSession()
    const uid = data.session?.user?.id
    if (!uid) throw new Error("No active session found. Please sign in again.")
    return uid
  }

  // SECTION: Fetch conversations list
  const fetchConversations = async () => {
    const { data, error: convErr } = await supabase
      .from("conversations")
      .select("id, title, created_at, updated_at")
      .order("updated_at", { ascending: false })

    if (convErr) throw convErr
    return (data ?? []) as Conversation[]
  }

  // SECTION: Ensure active conversation on mount
  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        setLoading(true)
        setError("")

        await getUserId()

        const list = await fetchConversations()
        if (cancelled) return

        setConversations(list)

        let active = list[0] ?? null
        if (!active) {
          const userId = await getUserId()
          const { data: created, error: createErr } = await supabase
            .from("conversations")
            .insert({ user_id: userId, title: "My Best Friend" })
            .select("id, title, created_at, updated_at")
            .single()

          if (createErr) throw createErr
          active = created as Conversation
          setConversations([active])
        }

        setActiveConversationId(active.id)
        setActiveConversationTitle(active.title)
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Something went wrong.")
      } finally {
        if (!cancelled) setLoading(false)
      }
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
      try {
        setLoading(true)
        setError("")

        const { data, error: fetchErr } = await supabase
          .from("messages")
          .select("id, role, text, created_at")
          .eq("conversation_id", convId)
          .order("created_at", { ascending: true })

        if (cancelled) return
        if (fetchErr) throw fetchErr

        const mapped = (data ?? []).map(toChatMessage)

        setMessages(
          mapped.length === 0
            ? [
                {
                  id: "seed-1",
                  role: "friend",
                  text: "Hey Joseph — I’m here. What do you want to focus on today?",
                  ts: Date.now(),
                },
              ]
            : mapped
        )
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Something went wrong.")
      } finally {
        if (!cancelled) setLoading(false)
      }
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
  }, [messages.length, status])

  // SECTION: Insert message row
  const insertMessage = async (role: "user" | "friend", text: string) => {
    const userId = await getUserId()
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

  // SECTION: Switch conversation
  const switchConversation = (convId: string) => {
    const conv = conversations.find((c) => c.id === convId)
    setActiveConversationId(convId)
    setActiveConversationTitle(conv?.title ?? "My Best Friend")
  }

  // SECTION: Rename conversation
  const renameConversation = async (convId: string, nextTitle: string) => {
    try {
      setError("")
      const next = nextTitle.trim()
      if (!next) return

      const updated = await updateConversationTitle(convId, next)

      setConversations((prev) =>
        prev.map((c) => (c.id === updated.id ? { ...c, title: updated.title } : c))
      )

      if (activeConversationId === convId) setActiveConversationTitle(updated.title)
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.")
    }
  }

  // SECTION: Delete conversation
  const deleteConversation = async (convId: string) => {
    try {
      setError("")
      const ok = window.confirm(
        "Delete this chat?\n\nThis will permanently delete the conversation and all messages."
      )
      if (!ok) return

      const { error: delErr } = await supabase.from("conversations").delete().eq("id", convId)
      if (delErr) throw delErr

      const list = await fetchConversations()
      setConversations(list)

      if (activeConversationId === convId) {
        const nextActive = list[0] ?? null
        if (!nextActive) {
          await newChat()
          return
        }
        setActiveConversationId(nextActive.id)
        setActiveConversationTitle(nextActive.title)
      }
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.")
    }
  }

  // SECTION: New chat
  const newChat = async () => {
    try {
      setError("")
      const userId = await getUserId()

      const { data: created, error: createErr } = await supabase
        .from("conversations")
        .insert({ user_id: userId, title: "New Chat" })
        .select("id, title, created_at, updated_at")
        .single()

      if (createErr) throw createErr

      const list = await fetchConversations()
      setConversations(list)

      setActiveConversationId(created.id)
      setActiveConversationTitle(created.title)
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.")
    }
  }

  // SECTION: Header prompt actions
  const renameChatPrompt = async () => {
    if (!activeConversationId) return
    const current = conversations.find((c) => c.id === activeConversationId)?.title ?? ""
    const next = window.prompt("Rename chat", current)?.trim()
    if (!next) return
    await renameConversation(activeConversationId, next)
  }

  const deleteChatPrompt = async () => {
    if (!activeConversationId) return
    await deleteConversation(activeConversationId)
  }

  // SECTION: Send message
  const send = async (forcedText?: string) => {
    const text = (forcedText ?? input).trim()
    if (!text) return
    if (status === "typing") return

    const hadUserBeforeSend = messages.some((m) => m.role === "user")
    const titleWasDefault = isDefaultConversationTitle(activeConversationTitle)

    if (!forcedText) setInput("")
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

      if (!hadUserBeforeSend && titleWasDefault && activeConversationId) {
        const nextTitle = deriveConversationTitleFromFirstMessage(text)
        try {
          const updated = await updateConversationTitle(activeConversationId, nextTitle)
          setConversations((prev) =>
            prev.map((c) => (c.id === updated.id ? { ...c, title: updated.title } : c))
          )
          setActiveConversationTitle(updated.title)
        } catch (e) {
          console.error("Auto-title failed:", e)
        }
      }

      setStatus("typing")

      const historySnapshot = [...messages.filter((m) => !m.id.startsWith("local-")), savedUser]
      const replyText = await getFriendReply(historySnapshot, text)

      const savedFriend = await insertMessage("friend", replyText)
      setMessages((prev) => [...prev, savedFriend])

      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", activeConversationId)

      const list = await fetchConversations()
      setConversations(list)
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.")
    } finally {
      setStatus("online")
    }
  }

  // SECTION: Empty-state suggestions
  const suggestions = [
    "Help me plan my day — I want to be productive but calm.",
    "I’m feeling stressed. Talk me down and help me reset.",
    "Help me set 3 goals for this week and keep me accountable.",
  ]

  // SECTION: Timeline render model
  const timeline = useMemo(() => {
    const items: Array<
      | { kind: "day"; key: string; label: string }
      | { kind: "msg"; msg: ChatMessage; showTime: boolean; tightTop: boolean }
    > = []

    let lastDay: number | null = null

    for (let i = 0; i < messages.length; i++) {
      const m = messages[i]
      const day = startOfDay(m.ts)

      if (lastDay === null || day !== lastDay) {
        items.push({ kind: "day", key: `day-${day}`, label: formatDayLabel(day) })
        lastDay = day
      }

      const prev = messages[i - 1]
      const next = messages[i + 1]

      const sameAsPrev = prev && prev.role === m.role && startOfDay(prev.ts) === day
      const sameAsNext = next && next.role === m.role && startOfDay(next.ts) === day

      items.push({
        kind: "msg",
        msg: m,
        tightTop: !!sameAsPrev,
        showTime: !sameAsNext,
      })
    }

    return items
  }, [messages])

  // SECTION: Input key handling (Enter sends, Shift+Enter newline)
  const onInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter") return
    if (e.shiftKey) return
    e.preventDefault()
    if (canSendNow) send()
  }

  return (
    <div className="min-h-[calc(100vh-140px)] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
      <div className="flex h-full">
        {/* SECTION: Sidebar */}
        <Sidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelect={switchConversation}
          onNewChat={newChat}
          onRename={renameConversation}
          onDelete={deleteConversation}
        />

        {/* SECTION: Chat panel */}
        <div className="flex min-h-0 flex-1 flex-col">
          {/* SECTION: Header */}
          <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-5 py-4">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-zinc-100">
                {activeConversationTitle || "My Best Friend"}
              </div>

              <div className="mt-1 text-xs text-zinc-400">
                {status === "online" ? "Online" : "Typing…"}{" "}
                <span className="inline-block translate-y-[1px] text-green-400">●</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 transition hover:bg-zinc-900 disabled:opacity-50"
                onClick={renameChatPrompt}
                disabled={loading || !activeConversationId}
              >
                Rename
              </button>

              <button
                className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-red-200 transition hover:bg-zinc-900 disabled:opacity-50"
                onClick={deleteChatPrompt}
                disabled={loading || !activeConversationId}
              >
                Delete
              </button>

              <button
                className="shrink-0 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 transition hover:bg-zinc-900"
                onClick={() => alert("Settings (later)")}
              >
                Settings
              </button>
            </div>
          </div>

          {/* SECTION: Body */}
          <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {loading ? (
              <div className="text-sm text-zinc-300">Loading…</div>
            ) : error ? (
              <div className="text-sm text-red-300">Error: {error}</div>
            ) : isEmptyChat ? (
              <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-6">
                  <div className="text-base font-semibold text-zinc-100">Start here</div>
                  <div className="mt-2 text-sm leading-relaxed text-zinc-400">
                    Tell me what you’re dealing with today. I’ll help you get clarity, set a plan, and stay calm while you execute.
                  </div>

                  <div className="mt-4 grid gap-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-left text-sm text-zinc-200 transition hover:bg-zinc-900"
                        onClick={() => setInput(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 text-xs text-zinc-500">Tip: Shift+Enter for a new line.</div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                  <div className="text-xs text-zinc-500">Friend</div>
                  <div className="mt-2 text-sm text-zinc-200">
                    Hey Joseph — I’m here. What do you want to focus on today?
                  </div>
                </div>
              </div>
            ) : (
              <div className="mx-auto w-full max-w-3xl">
                {timeline.map((item) => {
                  if (item.kind === "day") {
                    return (
                      <div key={item.key} className="my-5 flex items-center justify-center">
                        <div className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-400">
                          {item.label}
                        </div>
                      </div>
                    )
                  }

                  const m = item.msg
                  const isUser = m.role === "user"
                  const topGap = item.tightTop ? "mt-1" : "mt-4"

                  return (
                    <div
                      key={m.id}
                      className={[isUser ? "flex justify-end" : "flex justify-start", topGap].join(" ")}
                    >
                      <div className={isUser ? "items-end" : "items-start"}>
                        <div
                          className={[
                            "max-w-[520px] rounded-2xl border px-4 py-3 text-sm leading-relaxed",
                            isUser
                              ? "border-zinc-700 bg-zinc-50 text-zinc-900"
                              : "border-zinc-800 bg-zinc-900/40 text-zinc-100",
                          ].join(" ")}
                        >
                          {m.text}
                        </div>

                        {item.showTime && (
                          <div
                            className={[
                              "mt-1 text-[11px] text-zinc-500",
                              isUser ? "text-right" : "text-left",
                            ].join(" ")}
                          >
                            {formatTime(m.ts)}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                {status === "typing" && <TypingBubble />}
              </div>
            )}
          </div>

          {/* SECTION: Input */}
          <div className="border-t border-zinc-800 px-5 py-4">
            <div className="mx-auto w-full max-w-3xl">
              <textarea
                className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-50 outline-none transition focus:border-zinc-600"
                placeholder={status === "typing" ? "Waiting for reply…" : "Message…"}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onInputKeyDown}
                rows={2}
                disabled={loading || !activeConversationId}
              />

              <div className="mt-2 flex items-center justify-between">
                <div className="text-xs text-zinc-500">Enter to send • Shift+Enter for a new line</div>
                <button
                  className="rounded-xl border border-zinc-800 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-900 transition hover:opacity-90 disabled:opacity-50"
                  disabled={!canSendNow}
                  onClick={() => send()}
                >
                  {status === "typing" ? "Sending…" : "Send"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}