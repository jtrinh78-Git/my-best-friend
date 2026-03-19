import { useEffect, useState, useCallback } from "react"
import { supabase } from "../lib/supabase"
import { getFriendReply, updateConversationTitle } from "../lib/chat"
import { fetchTopMemories, setMemoryPinned, deleteMemory } from "../lib/memory"
import { saveImportantMemoriesFromUserMessage } from "../lib/memoryCapture"
import {
  deriveConversationTitleFromFirstMessage,
  isDefaultConversationTitle,
} from "../lib/conversationTitles"
import Sidebar from "../components/Sidebar"
import ChatHeader from "../components/chat/ChatHeader"
import MessageList from "../components/chat/MessageList"
import ChatInput from "../components/chat/ChatInput"
import MemoryPanel from "../components/memory/MemoryPanel"
import { ToastContainer, useToast } from "../components/ui/Toast"
import { SidebarSkeleton } from "../components/ui/Skeleton"
import type { ChatMessage, Conversation, MemoryRow } from "../types"

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function getUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const uid = data.session?.user?.id
  if (!uid) throw new Error("No active session. Please sign in again.")
  return uid
}

function toChatMessage(row: {
  id: string
  role: string
  text: string
  created_at: string
}): ChatMessage {
  return {
    id: row.id,
    role: row.role as "user" | "friend",
    text: row.text,
    ts: new Date(row.created_at).getTime(),
  }
}

async function fetchConversations(): Promise<Conversation[]> {
  const uid = await getUserId()
  const { data, error } = await supabase
    .from("conversations")
    .select("id, title, created_at, updated_at")
    .eq("user_id", uid)
    .order("updated_at", { ascending: false })
    .limit(50)
  if (error) throw error
  return (data ?? []) as Conversation[]
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MainApp() {
  const { toasts, addToast, dismiss } = useToast()

  // ── Conversations ──
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [convsLoading, setConvsLoading] = useState(true)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [activeConversationTitle, setActiveConversationTitle] = useState("My Best Friend")

  // ── Messages ──
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)

  // ── Input / send ──
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)

  // ── Memory ──
  const [memoryOpen, setMemoryOpen] = useState(false)
  const [memories, setMemories] = useState<MemoryRow[]>([])
  const [memoriesLoading, setMemoriesLoading] = useState(false)
  const [memoriesError, setMemoriesError] = useState<string | null>(null)

  // ─── Load conversations on mount ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setConvsLoading(true)
        const list = await fetchConversations()
        if (cancelled) return
        setConversations(list)
        if (list.length > 0) {
          setActiveConversationId(list[0].id)
          setActiveConversationTitle(list[0].title ?? "My Best Friend")
        } else {
          await createNewChat()
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Failed to load conversations."
          addToast(msg, "error")
        }
      } finally {
        if (!cancelled) setConvsLoading(false)
      }
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Load messages when active conversation changes ───────────────────────
  useEffect(() => {
    if (!activeConversationId) return
    let cancelled = false
    ;(async () => {
      try {
        setMessagesLoading(true)
        const { data, error: fetchErr } = await supabase
          .from("messages")
          .select("id, role, text, created_at")
          .eq("conversation_id", activeConversationId)
          .order("created_at", { ascending: true })
        if (cancelled) return
        if (fetchErr) throw fetchErr
        const mapped = (data ?? []).map(toChatMessage)
        setMessages(
          mapped.length === 0
            ? [{ id: "seed-1", role: "friend", text: "Hey — I'm here. What do you want to focus on today?", ts: Date.now() }]
            : mapped
        )
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Failed to load messages."
          addToast(msg, "error")
        }
      } finally {
        if (!cancelled) setMessagesLoading(false)
      }
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId])

  // ─── Load memories when panel opens ──────────────────────────────────────
  const refreshMemories = useCallback(async () => {
    try {
      setMemoriesLoading(true)
      setMemoriesError(null)
      const data = await fetchTopMemories({ limit: 50, conversationId: activeConversationId })
      setMemories(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load memories."
      setMemoriesError(msg)
    } finally {
      setMemoriesLoading(false)
    }
  }, [activeConversationId])

  useEffect(() => {
    if (memoryOpen) refreshMemories()
  }, [memoryOpen, refreshMemories])

  // ─── Insert a message row ─────────────────────────────────────────────────
  const insertMessage = async (role: "user" | "friend", text: string): Promise<ChatMessage> => {
    const userId = await getUserId()
    const convId = activeConversationId
    if (!convId) throw new Error("No active conversation.")
    const { data, error: insertErr } = await supabase
      .from("messages")
      .insert({ user_id: userId, conversation_id: convId, role, text })
      .select("id, role, text, created_at")
      .single()
    if (insertErr) throw insertErr
    return toChatMessage(data)
  }

  // ─── Send message ─────────────────────────────────────────────────────────
  const send = async () => {
    const text = input.trim()
    if (!text || isTyping) return

    const hadUserMsg = messages.some((m) => m.role === "user")
    const titleWasDefault = isDefaultConversationTitle(activeConversationTitle)

    setInput("")

    const optimisticUser: ChatMessage = { id: `local-u-${Date.now()}`, role: "user", text, ts: Date.now() }
    setMessages((prev) => [...prev.filter((m) => m.id !== "seed-1"), optimisticUser])
    setIsTyping(true)

    try {
      const saved = await insertMessage("user", text)
      setMessages((prev) => prev.map((m) => (m.id === optimisticUser.id ? saved : m)))

      // Auto-title on first user message
      if (!hadUserMsg && titleWasDefault) {
        const newTitle = deriveConversationTitleFromFirstMessage(text)
        try {
          const updated = await updateConversationTitle(activeConversationId!, newTitle)
          setActiveConversationTitle(updated.title ?? newTitle)
          setConversations((prev) =>
            prev.map((c) => (c.id === activeConversationId ? { ...c, title: updated.title } : c))
          )
        } catch {
          // Non-critical — title update failure should not block chat
        }
      }

      // Memory capture (non-blocking)
      saveImportantMemoriesFromUserMessage({ text, conversationId: activeConversationId }).catch(() => {})

      // Get reply
      const replyText = await getFriendReply(messages, text, activeConversationId)
      const savedReply = await insertMessage("friend", replyText)
      setMessages((prev) => [...prev, savedReply])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong."
      addToast(msg, "error")
      setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id))
    } finally {
      setIsTyping(false)
    }
  }

  // ─── Conversation management ──────────────────────────────────────────────
  const createNewChat = async () => {
    try {
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
      setActiveConversationTitle(created.title ?? "New Chat")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create chat."
      addToast(msg, "error")
    }
  }

  const switchConversation = (convId: string) => {
    const conv = conversations.find((c) => c.id === convId)
    setActiveConversationId(convId)
    setActiveConversationTitle(conv?.title ?? "My Best Friend")
    setMemoryOpen(false)
  }

  const renameConversation = async (convId: string, nextTitle: string) => {
    const trimmed = nextTitle.trim()
    if (!trimmed) return
    try {
      const updated = await updateConversationTitle(convId, trimmed)
      setConversations((prev) =>
        prev.map((c) => (c.id === updated.id ? { ...c, title: updated.title } : c))
      )
      if (activeConversationId === convId) setActiveConversationTitle(updated.title ?? trimmed)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to rename chat."
      addToast(msg, "error")
    }
  }

  const deleteConversation = async (convId: string) => {
    const ok = window.confirm("Delete this chat? This cannot be undone.")
    if (!ok) return
    try {
      const { error: delErr } = await supabase.from("conversations").delete().eq("id", convId)
      if (delErr) throw delErr
      const list = await fetchConversations()
      setConversations(list)
      if (activeConversationId === convId) {
        if (list.length > 0) {
          setActiveConversationId(list[0].id)
          setActiveConversationTitle(list[0].title ?? "My Best Friend")
        } else {
          await createNewChat()
        }
      }
      addToast("Chat deleted.", "info")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete chat."
      addToast(msg, "error")
    }
  }

  const handleRenamePrompt = async () => {
    if (!activeConversationId) return
    const current = conversations.find((c) => c.id === activeConversationId)?.title ?? ""
    const next = window.prompt("Rename chat", current)?.trim()
    if (next) await renameConversation(activeConversationId, next)
  }

  // ─── Memory management ────────────────────────────────────────────────────
  const togglePinMemory = async (m: MemoryRow) => {
    try {
      await setMemoryPinned(m.id, !m.pinned)
      setMemories((prev) => prev.map((x) => (x.id === m.id ? { ...x, pinned: !m.pinned } : x)))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update memory."
      addToast(msg, "error")
    }
  }

  const removeMemory = async (m: MemoryRow) => {
    try {
      await deleteMemory(m.id)
      setMemories((prev) => prev.filter((x) => x.id !== m.id))
      addToast("Memory deleted.", "info")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete memory."
      addToast(msg, "error")
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden rounded-2xl border border-zinc-800">
      {/* Sidebar */}
      <div className="w-56 shrink-0 border-r border-zinc-800 bg-zinc-950">
        {convsLoading ? (
          <SidebarSkeleton />
        ) : (
          <Sidebar
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelect={switchConversation}
            onNewChat={createNewChat}
            onDelete={deleteConversation}
            onRename={renameConversation}
          />
        )}
      </div>

      {/* Main chat area */}
      <div className="relative flex flex-1 flex-col overflow-hidden bg-zinc-950">
        <ChatHeader
          title={activeConversationTitle}
          memoryOpen={memoryOpen}
          onToggleMemory={() => setMemoryOpen((v) => !v)}
          onRename={handleRenamePrompt}
          onDelete={() => activeConversationId && deleteConversation(activeConversationId)}
        />

        <MessageList
          messages={messages}
          isTyping={isTyping}
          loading={messagesLoading}
        />

        {memoryOpen && (
          <MemoryPanel
            memories={memories}
            loading={memoriesLoading}
            error={memoriesError}
            onRefresh={refreshMemories}
            onTogglePin={togglePinMemory}
            onDelete={removeMemory}
          />
        )}

        <ChatInput
          value={input}
          onChange={setInput}
          onSend={send}
          disabled={!activeConversationId || messagesLoading}
          isTyping={isTyping}
        />
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
