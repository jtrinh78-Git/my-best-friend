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
  const scrollerRef = useRef<HTMLDivElement | null>(null)

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

        // Pick most recent or create one
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
  }, [messages.length])

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

  // SECTION: Rename conversation (used by Sidebar + header)
  const renameConversation = async (convId: string, nextTitle: string) => {
    try {
      setError("")
      const next = nextTitle.trim()
      if (!next) return

      const updated = await updateConversationTitle(convId, next)

      setConversations((prev) =>
        prev.map((c) => (c.id === updated.id ? { ...c, title: updated.title } : c))
      )

      if (activeConversationId === convId) {
        setActiveConversationTitle(updated.title)
      }
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.")
    }
  }

  // SECTION: Delete conversation (safe switching)
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

      // If we deleted the active chat, switch safely
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

  // SECTION: Header rename button (prompt)
  const renameChatPrompt = async () => {
    if (!activeConversationId) return
    const current = conversations.find((c) => c.id === activeConversationId)?.title ?? ""
    const next = window.prompt("Rename chat", current)?.trim()
    if (!next) return
    await renameConversation(activeConversationId, next)
  }

  // SECTION: Header delete button
  const deleteChatPrompt = async () => {
    if (!activeConversationId) return
    await deleteConversation(activeConversationId)
  }

  // SECTION: Send message
  const send = async () => {
    const text = input.trim()
    if (!text) return

    // SECTION: Auto-title capture
    const hadUserBeforeSend = messages.some((m) => m.role === "user")
    const titleWasDefault = isDefaultConversationTitle(activeConversationTitle)

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

      // SECTION: Auto-title on first user message
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
          <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
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
                className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 disabled:opacity-50"
                onClick={renameChatPrompt}
                disabled={loading || !activeConversationId}
              >
                Rename
              </button>

              <button
                className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-red-200 disabled:opacity-50"
                onClick={deleteChatPrompt}
                disabled={loading || !activeConversationId}
              >
                Delete
              </button>

              <button
                className="shrink-0 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                onClick={() => alert("Settings (later)")}
              >
                Settings
              </button>
            </div>
          </div>

          {/* SECTION: Body */}
          <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
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
              (Sidebar is now componentized. Next we’ll add timestamps + spacing polish.)
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}