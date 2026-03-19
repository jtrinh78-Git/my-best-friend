import { useRef, useEffect } from "react"

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled: boolean
  isTyping: boolean
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
  isTyping,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && value.trim()) onSend()
    }
  }

  const canSend = !disabled && value.trim().length > 0 && !isTyping

  return (
    <div className="border-t border-zinc-800 px-5 py-4">
      <div className="mx-auto w-full max-w-3xl">
        <div className="relative flex items-end gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 transition focus-within:border-zinc-600">
          <textarea
            ref={textareaRef}
            className="flex-1 resize-none bg-transparent text-sm text-zinc-50 outline-none placeholder:text-zinc-600"
            placeholder={isTyping ? "Waiting for reply…" : "Message…"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={disabled}
          />
          <button
            className="shrink-0 rounded-lg bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-900 transition hover:opacity-90 active:opacity-75 disabled:opacity-30"
            disabled={!canSend}
            onClick={onSend}
          >
            {isTyping ? "…" : "Send"}
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-zinc-700">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
