import { useEffect, useRef } from "react"
import type { ChatMessage } from "../../types"
import { ChatSkeleton } from "../ui/Skeleton"

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function formatDayLabel(ts: number): string {
  const d = new Date(ts)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return "Today"
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday"
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })
}

function groupByDay(messages: ChatMessage[]): Array<{ label: string; messages: ChatMessage[] }> {
  const groups: Array<{ label: string; messages: ChatMessage[] }> = []
  let currentLabel = ""

  for (const msg of messages) {
    const label = formatDayLabel(msg.ts)
    if (label !== currentLabel) {
      currentLabel = label
      groups.push({ label, messages: [msg] })
    } else {
      groups[groups.length - 1].messages.push(msg)
    }
  }
  return groups
}

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-end gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-sm">
        🤝
      </div>
      <div className="rounded-2xl rounded-bl-sm border border-zinc-800 bg-zinc-900/60 px-4 py-3">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-400"
              style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Single message bubble ────────────────────────────────────────────────────
interface MessageBubbleProps {
  msg: ChatMessage
  showTime: boolean
}

function MessageBubble({ msg, showTime }: MessageBubbleProps) {
  const isUser = msg.role === "user"

  return (
    <div className={`flex items-end gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-sm">
          🤝
        </div>
      )}
      <div className={`flex max-w-[75%] flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={[
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "rounded-br-sm bg-zinc-50 text-zinc-900"
              : "rounded-bl-sm border border-zinc-800 bg-zinc-900/60 text-zinc-100",
          ].join(" ")}
        >
          {msg.text}
        </div>
        {showTime && (
          <span className="text-[11px] text-zinc-600">{formatTime(msg.ts)}</span>
        )}
      </div>
      {isUser && <div className="h-8 w-8 shrink-0" />}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
interface MessageListProps {
  messages: ChatMessage[]
  isTyping: boolean
  loading: boolean
}

export default function MessageList({ messages, isTyping, loading }: MessageListProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages.length, isTyping])

  if (loading) {
    return (
      <div ref={scrollerRef} className="flex-1 overflow-y-auto">
        <ChatSkeleton />
      </div>
    )
  }

  const groups = groupByDay(messages)

  return (
    <div ref={scrollerRef} className="flex-1 overflow-y-auto">
      <div className="flex flex-col gap-4 px-5 py-4">
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-3">
            {/* Day separator */}
            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-zinc-800" />
              <span className="text-[11px] font-medium text-zinc-600">{group.label}</span>
              <div className="h-px flex-1 bg-zinc-800" />
            </div>
            {/* Messages */}
            {group.messages.map((msg, idx) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                showTime={
                  idx === group.messages.length - 1 ||
                  group.messages[idx + 1]?.role !== msg.role
                }
              />
            ))}
          </div>
        ))}

        {isTyping && <TypingIndicator />}
      </div>
    </div>
  )
}
