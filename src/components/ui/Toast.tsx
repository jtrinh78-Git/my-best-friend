import { useEffect, useState } from "react"

export type ToastType = "success" | "error" | "info"

export interface ToastMessage {
  id: string
  type: ToastType
  message: string
}

interface ToastItemProps {
  toast: ToastMessage
  onDismiss: (id: string) => void
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  const colorMap: Record<ToastType, string> = {
    success: "border-emerald-800 bg-emerald-950/80 text-emerald-200",
    error: "border-red-800 bg-red-950/80 text-red-200",
    info: "border-zinc-700 bg-zinc-900/90 text-zinc-100",
  }

  const iconMap: Record<ToastType, string> = {
    success: "✓",
    error: "✕",
    info: "i",
  }

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm transition-all ${colorMap[toast.type]}`}
    >
      <span className="mt-0.5 shrink-0 text-xs font-bold opacity-70">
        {iconMap[toast.type]}
      </span>
      <p className="text-sm leading-relaxed">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="ml-auto shrink-0 text-xs opacity-50 hover:opacity-100 transition"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: ToastMessage[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 w-80">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = (message: string, type: ToastType = "info") => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((prev) => [...prev, { id, type, message }])
  }

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return { toasts, addToast, dismiss }
}
