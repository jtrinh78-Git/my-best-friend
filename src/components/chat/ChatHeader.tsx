interface ChatHeaderProps {
  title: string
  memoryOpen: boolean
  onToggleMemory: () => void
  onRename: () => void
  onDelete: () => void
}

export default function ChatHeader({
  title,
  memoryOpen,
  onToggleMemory,
  onRename,
  onDelete,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-5 py-3">
      <h2 className="truncate text-sm font-semibold text-zinc-100">{title || "My Best Friend"}</h2>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={onToggleMemory}
          className={[
            "rounded-xl border px-3 py-1.5 text-xs font-medium transition",
            memoryOpen
              ? "border-zinc-600 bg-zinc-800 text-zinc-100"
              : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700",
          ].join(" ")}
        >
          Memory
        </button>
        <button
          onClick={onRename}
          className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-400 transition hover:text-zinc-100 hover:border-zinc-700"
        >
          Rename
        </button>
        <button
          onClick={onDelete}
          className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-red-400 transition hover:text-red-200 hover:border-red-900"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
