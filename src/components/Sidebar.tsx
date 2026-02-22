import { useEffect, useMemo, useState } from "react"

// SECTION: Types
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

// SECTION: Sidebar
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
    return [...conversations].sort((a, b) => {
      const at = a.updated_at ? new Date(a.updated_at).getTime() : 0
      const bt = b.updated_at ? new Date(b.updated_at).getTime() : 0
      return bt - at
    })
  }, [conversations])

  useEffect(() => {
    const onDocClick = () => setMenuOpenId(null)
    window.addEventListener("click", onDocClick)
    return () => window.removeEventListener("click", onDocClick)
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
    <aside className="h-full w-72 shrink-0 border-r border-zinc-800 bg-zinc-950">
      {/* SECTION: Header */}
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800 px-4 py-4">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-zinc-100">Chats</div>
          <div className="truncate text-xs text-zinc-500">Your conversations</div>
        </div>

        <button
          onClick={onNewChat}
          className="rounded-xl border border-zinc-800 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-900 transition hover:opacity-90 active:opacity-80"
        >
          New
        </button>
      </div>

      {/* SECTION: List */}
      <div className="px-2 py-3">
        {ordered.length === 0 ? (
          <div className="px-3 py-6 text-sm text-zinc-400">
            No chats yet.
            <div className="mt-2 text-xs text-zinc-500">Click “New” to start.</div>
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
                      "hover:bg-zinc-900/40",
                      isActive ? "bg-zinc-900/60" : "bg-transparent",
                    ].join(" ")}
                  >
                    {/* active bar */}
                    <span
                      className={[
                        "absolute left-0 top-2 bottom-2 w-1 rounded-full transition-opacity",
                        isActive ? "bg-zinc-50 opacity-100" : "bg-transparent opacity-0 group-hover:opacity-30",
                      ].join(" ")}
                    />

                    <button
                      onClick={() => onSelect(c.id)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <span
                        className={[
                          "inline-block h-2 w-2 rounded-full transition",
                          isActive ? "bg-zinc-50" : "bg-zinc-600 group-hover:bg-zinc-400",
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
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                          placeholder="Conversation title"
                        />
                      ) : (
                        <span className={["truncate text-sm font-medium", isActive ? "text-zinc-100" : "text-zinc-200"].join(" ")}>
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
                          "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100",
                        ].join(" ")}
                        aria-label="Conversation menu"
                      >
                        •••
                      </button>

                      {menuOpenId === c.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-9 z-20 w-40 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-lg"
                        >
                          <button
                            className="w-full px-3 py-2 text-left text-sm text-zinc-100 hover:bg-zinc-900"
                            onClick={() => startRename(c)}
                          >
                            Rename
                          </button>
                          <button
                            className="w-full px-3 py-2 text-left text-sm text-red-200 hover:bg-red-950/30"
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