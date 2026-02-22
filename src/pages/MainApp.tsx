import { useMemo, useRef, useState, useEffect } from "react"

// SECTION: Types
type Msg = {
  id: string
  role: "friend" | "user"
  text: string
  ts: number
}

// SECTION: MainApp
export default function MainApp() {
  const [friendName] = useState("My Best Friend")
  const [status] = useState<"online" | "typing">("online")
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Msg[]>(() => [
    {
      id: "m1",
      role: "friend",
      text: "Hey Joseph — I’m here. How are you feeling today?",
      ts: Date.now() - 60_000,
    },
    { id: "m2", role: "user", text: "Pretty good. Just building the app.", ts: Date.now() - 40_000 },
    {
      id: "m3",
      role: "friend",
      text: "That’s awesome. Want me to help you plan the next step?",
      ts: Date.now() - 20_000,
    },
  ])

  const canSend = useMemo(() => input.trim().length > 0, [input])
  const scrollerRef = useRef<HTMLDivElement | null>(null)

  // SECTION: Auto-scroll
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages.length])

  // SECTION: Send (UI only for now)
  const send = () => {
    const text = input.trim()
    if (!text) return

    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", text, ts: Date.now() },
    ])
    setInput("")

    // Fake friend response (placeholder)
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `f-${Date.now()}`,
          role: "friend",
          text: "Got it. (AI reply will be added in Phase 4.)",
          ts: Date.now(),
        },
      ])
    }, 450)
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
          onClick={() => alert("Settings (Task 36+)")}
        >
          Settings
        </button>
      </div>

      {/* SECTION: Messages */}
      <div
        ref={scrollerRef}
        className="h-[calc(100vh-140px-56px-72px)] overflow-y-auto px-4 py-4"
      >
        <div className="space-y-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
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
          />
          <button
            className="rounded-xl border border-zinc-800 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50"
            disabled={!canSend}
            onClick={send}
          >
            Send
          </button>
        </div>
        <div className="mt-2 text-xs text-zinc-500">
          (Phase 4 will replace the placeholder response with real AI.)
        </div>
      </div>
    </div>
  )
}