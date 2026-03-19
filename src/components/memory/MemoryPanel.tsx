import type { MemoryRow } from "../../types"
import { MemorySkeleton } from "../ui/Skeleton"

interface MemoryPanelProps {
  memories: MemoryRow[]
  loading: boolean
  error: string | null
  onRefresh: () => void
  onTogglePin: (memory: MemoryRow) => void
  onDelete: (memory: MemoryRow) => void
}

export default function MemoryPanel({
  memories,
  loading,
  error,
  onRefresh,
  onTogglePin,
  onDelete,
}: MemoryPanelProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className="pointer-events-auto absolute right-4 top-4 w-[360px] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-zinc-800 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-100">Memory</p>
            <p className="text-xs text-zinc-500">What I've saved about you</p>
          </div>
          <button
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 transition hover:bg-zinc-800 disabled:opacity-40"
            onClick={onRefresh}
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <MemorySkeleton />
          ) : error ? (
            <div className="px-4 py-4 text-sm text-red-300">{error}</div>
          ) : memories.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-zinc-400">No memories yet.</p>
              <p className="mt-1.5 text-xs text-zinc-600">
                Try saying "my name is …" or "I prefer …"
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 p-3">
              {memories.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {m.pinned && (
                          <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[11px] font-medium text-zinc-200">
                            Pinned
                          </span>
                        )}
                        <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[11px] text-zinc-400">
                          {m.category || "general"}
                        </span>
                        <span className="text-[11px] text-zinc-600">
                          {m.importance ?? 50}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-zinc-100">
                        {m.content}
                      </p>
                      <p className="mt-1.5 text-[11px] text-zinc-600">
                        {m.source || "auto"}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1.5">
                      <button
                        className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 transition hover:bg-zinc-800"
                        onClick={() => onTogglePin(m)}
                      >
                        {m.pinned ? "Unpin" : "Pin"}
                      </button>
                      <button
                        className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-red-300 transition hover:bg-red-950/30"
                        onClick={() => onDelete(m)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 px-4 py-3 text-xs text-zinc-600">
          Pin the important ones so they always stay on top.
        </div>
      </div>
    </div>
  )
}
