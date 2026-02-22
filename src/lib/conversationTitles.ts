// SECTION: Conversation title helpers

export function deriveConversationTitleFromFirstMessage(text: string): string {
  const cleaned = (text || "")
    .replace(/\s+/g, " ")
    .replace(/[\r\n]+/g, " ")
    .trim()

  if (!cleaned) return "New Chat"

  // Strip leading punctuation/quotes
  const stripped = cleaned.replace(/^[“"'`(\[\{]+/, "").trim()

  // Take first ~7 words
  const words = stripped.split(" ").slice(0, 7).join(" ").trim()

  // Hard cap length (premium UI)
  const max = 42
  let title = words.length > max ? words.slice(0, max).trimEnd() + "…" : words

  // If it ends up empty for any weird case
  if (!title) title = "New Chat"

  return title
}

export function isDefaultConversationTitle(title: string | null | undefined): boolean {
  const t = (title ?? "").trim().toLowerCase()
  return !t || t === "new chat" || t.startsWith("new chat ")
}