import { supabase } from "./supabase"
import { fetchTopMemories, touchMemories, MemoryRow } from "./memory"

// SECTION: Types
export type ChatMessage = {
  id: string
  role: "user" | "friend"
  text: string
  ts: number
}

// SECTION: Memory helpers
function tokenize(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
}

function scoreRelevance(query: string, mem: MemoryRow) {
  const q = new Set(tokenize(query))
  const m = tokenize(`${mem.category ?? ""} ${mem.key ?? ""} ${mem.content ?? ""}`)
  if (m.length === 0) return 0

  let hits = 0
  for (const w of m) {
    if (q.has(w)) hits++
  }

  // lightly weight pinned + importance so good memories rise
  const pinnedBoost = mem.pinned ? 2 : 0
  const importanceBoost = Math.max(0, Math.min(3, Math.floor((mem.importance ?? 50) / 25) - 1)) // 0..3
  return hits + pinnedBoost + importanceBoost
}

function buildMemoryContextLine(memories: MemoryRow[]) {
  if (memories.length === 0) return ""
  const lines = memories.map((m) => `- ${m.content}`).join("\n")
  return `Memory Context (use naturally, do not repeat verbatim):\n${lines}`
}

// SECTION: Mock Reply Service (memory-aware)
export async function getFriendReply(history: ChatMessage[], userMessage: string): Promise<string> {
  // Simulate network delay
  await new Promise((res) => setTimeout(res, 500))

  // SECTION: Fetch + select relevant memories
  let memoryPreamble = ""
  try {
    const top = await fetchTopMemories({ limit: 12 })
    const scored = top
      .map((m) => ({ m, score: scoreRelevance(userMessage, m) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)

    const selected = scored.map((x) => x.m)

    if (selected.length > 0) {
      memoryPreamble = buildMemoryContextLine(selected)

      // record that we used these memories
      await touchMemories(selected.map((m) => m.id))
    }
  } catch {
    // fail silently — memory should never block chat
  }

  const t = userMessage.toLowerCase()

  // SECTION: Reply templates
  let baseReply = "I’m with you. Tell me more—what’s the main thing on your mind?"

  if (t.includes("plan") || t.includes("next")) {
    baseReply =
      "Okay. Here are 3 steps: 1) pick the goal, 2) pick the next tiny action, 3) set a reminder."
  } else if (t.includes("stress") || t.includes("anx")) {
    baseReply =
      "I hear you. Want to do a quick 30-second reset: inhale 4, hold 4, exhale 6?"
  }

  // SECTION: Minimal memory injection
  // If we have memory context, we nudge the tone to use it without dumping it.
  if (memoryPreamble) {
    return `I’m remembering a few helpful things about you.\n\n${baseReply}`
  }

  return baseReply
}

// SECTION: Conversation title updates
export async function updateConversationTitle(conversationId: string, title: string) {
  const trimmed = title.trim()

  const { data, error } = await supabase
    .from("conversations")
    .update({
      title: trimmed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId)
    .select("id,title,updated_at")
    .single()

  if (error) throw error
  return data
}