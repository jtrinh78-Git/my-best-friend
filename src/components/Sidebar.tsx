import { useEffect, useMemo, useState } from "react"

type Conversation = {
  id: string
  title: string | null
  updated_at?: string | null
}

type Props = {
  conversations: Conversation[]
  activeConversationId: string | null
  onSelect: (id: string) => void
  onNewChat: () => void
  onRename: (id: string, nextTitle: string) => Promise<void> | void
  onDelete: (id: string) => Promise<void> | void
}

export default function Sidebar({
  conversations,
  activeConversationId,
  onSelect,
  onNewChat,
  onRename,
  onDelete,
}: Props) {
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  const ordered = useMemo(() => {
    // You said you already fetch ordered by updated_at; this is a safety fallback.
    return [...conversations].sort((a, b) => {
      const at = a.updated_at ? new Date(a.updated_at).getTime() : 0
      const bt = b.updated_at ? new Date(b.updated_at).getTime() : 0
      return bt - at
    })
  }, [conversations])

  useEffect(() => {
    const close = () => setMenuOpenId(null)
    window.addEventListener("click", close)
    return () => window.removeEventListener("click", close)
  }, [])

  const startRename = (c: Conversation) => {
    setMenuOpenId(null)
    setRenamingId(c.id)
    setRenameValue((c.title ?? "New chat").trim())
  }

  const submitRename = async (id: string) => {
    const next = renameValue.trim()
    setRenamingId(null)
    if (!next) return
    await onRename(id, next)
  }

  return (
    <aside className="h-full w-72 shrink-0 border-r border-zinc-200 bg-white">
      {/* // SECTION: Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-zinc-900">My Best Friend</div>
          <div className="truncate text-xs text-zinc-500">Chats</div>
        </div>

        <button
          onClick={onNewChat}
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 active:opacity-80"
        >
          New
        </button>
      </div>

      {/* // SECTION: List */}
      <div className="px-2 pb-3">
        {ordered.length === 0 ? (
          <div className="px-3 py-6 text-sm text-zinc-500">
            No conversations yet.
            <div className="mt-2 text-xs text-zinc-400">Click “New” to start your first chat.</div>
          </div>
        ) : (
          <ul className="space-y-1">
            {ordered.map((c) => {
              const isActive = c.id === activeConversationId

              return (
                <li key={c.id}>
                  <div
                    className={[
                      "group relative flex items-center gap-2 rounded-xl px-3 py-2 transition",
                      isActive ? "bg-zinc-900 text-white" : "bg-transparent text-zinc-900 hover:bg-zinc-100",
                    ].join(" ")}
                  >
                    <button
                      onClick={() => onSelect(c.id)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <span
                        className={[
                          "inline-block h-2 w-2 rounded-full",
                          isActive ? "bg-white" : "bg-zinc-300 group-hover:bg-zinc-400",
                        ].join(" ")}
                      />
                      {renamingId === c.id ? (
                        <input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") submitRename(c.id)
                            if (e.key === "Escape") setRenamingId(null)
                          }}
                          onBlur={() => submitRename(c.id)}
                          autoFocus
                          className={[
                            "w-full rounded-lg px-2 py-1 text-sm outline-none",
                            isActive ? "bg-white/10 text-white placeholder-white/60" : "bg-white text-zinc-900",
                          ].join(" ")}
                          placeholder="Conversation title"
                        />
                      ) : (
                        <span className="truncate text-sm font-medium">
                          {(c.title ?? "New chat").trim() || "New chat"}
                        </span>
                      )}
                    </button>

                    {/* menu button */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setMenuOpenId((prev) => (prev === c.id ? null : c.id))
                        }}
                        className={[
                          "rounded-lg px-2 py-1 text-xs transition",
                          isActive
                            ? "text-white/80 hover:bg-white/10 hover:text-white"
                            : "text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800",
                        ].join(" ")}
                        aria-label="Conversation menu"
                      >
                        •••
                      </button>

                      {menuOpenId === c.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-9 z-20 w-40 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg"
                        >
                          <button
                            className="w-full px-3 py-2 text-left text-sm text-zinc-900 hover:bg-zinc-100"
                            onClick={() => startRename(c)}
                          >
                            Rename
                          </button>
                          <button
                            className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                            onClick={async () => {
                              setMenuOpenId(null)
                              await onDelete(c.id)
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </aside>
  )
}