import { supabase } from "./supabase"
import { fetchTopMemories, touchMemories, MemoryRow } from "./memory"
// SECTION: Smart memory recall (Task 49)

type SmartMemory = {
  id: string
  content: string
  pinned: boolean
  importance: number | null
  conversation_id: string | null
}

const MBF_STOPWORDS = new Set([
  "the","a","an","and","or","but","to","of","in","on","for","with","is","are","was","were","be","been",
  "it","that","this","i","you","we","me","my","your","our","they","them","he","she","his","her","as","at","by",
])

function mbfTokenize(text: string): Set<string> {
  return new Set(
    (text || "")
      .toLowerCase()
      .split(/[^a-z0-9]+/g)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2 && !MBF_STOPWORDS.has(t))
  )
}

function mbfOverlapScore(userTokens: Set<string>, memoryText: string): number {
  const memTokens = mbfTokenize(memoryText)
  let overlap = 0
  for (const t of userTokens) if (memTokens.has(t)) overlap++
  return overlap / Math.sqrt(userTokens.size + 1)
}

function mbfTruncate(text: string, maxChars = 320): string {
  const clean = (text || "").trim().replace(/\s+/g, " ")
  if (clean.length <= maxChars) return clean
  return clean.slice(0, maxChars - 1).trimEnd() + "…"
}

async function mbfFetchMemoryCandidates(conversationId?: string | null): Promise<{
  globalPinned: SmartMemory[]
  convoScoped: SmartMemory[]
}> {
  const { data: userRes } = await supabase.auth.getUser()
  const userId = userRes.user?.id
  if (!userId) return { globalPinned: [], convoScoped: [] }

  const globalPinnedQ = supabase
    .from("memories")
    .select("id, content, pinned, importance, conversation_id")
    .eq("user_id", userId)
    .is("conversation_id", null)
    .eq("pinned", true)
    .order("importance", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(5)

  const convoScopedQ = conversationId
    ? supabase
        .from("memories")
        .select("id, content, pinned, importance, conversation_id")
        .eq("user_id", userId)
        .eq("conversation_id", conversationId)
        .order("pinned", { ascending: false })
        .order("importance", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(10)
    : Promise.resolve({ data: [] as any[] })

  const [{ data: globalPinned, error: gpErr }, { data: convoScoped, error: csErr }] =
    await Promise.all([globalPinnedQ, convoScopedQ as any])

  if (gpErr || csErr) {
    return {
      globalPinned: Array.isArray(globalPinned) ? (globalPinned as SmartMemory[]) : [],
      convoScoped: Array.isArray(convoScoped) ? (convoScoped as SmartMemory[]) : [],
    }
  }

  return {
    globalPinned: (globalPinned ?? []) as SmartMemory[],
    convoScoped: (convoScoped ?? []) as SmartMemory[],
  }
}

function mbfRankMemories(userMessage: string, globalPinned: SmartMemory[], convoScoped: SmartMemory[]) {
  const userTokens = mbfTokenize(userMessage)

  const unique = new Map<string, SmartMemory>()
  for (const m of [...globalPinned, ...convoScoped]) {
    if (!m?.id || !m?.content) continue
    if (!unique.has(m.id)) unique.set(m.id, m)
  }

  const scored = Array.from(unique.values()).map((m) => {
    const pinnedBoost = m.pinned ? 1000 : 0
    const importance = typeof m.importance === "number" ? m.importance : 0
    const overlap = mbfOverlapScore(userTokens, m.content)
    const score = pinnedBoost + importance * 10 + overlap * 100
    return { m, score }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored.map((x) => x.m)
}

async function mbfBuildMemoryContext(userMessage: string, conversationId?: string | null) {
  const { globalPinned, convoScoped } = await mbfFetchMemoryCandidates(conversationId)
  const ranked = mbfRankMemories(userMessage, globalPinned, convoScoped)

  const picked = ranked.slice(0, 5)
  if (picked.length === 0) return ""

  const lines = picked.map((m) => `• ${mbfTruncate(m.content, 320)}`)

  return [
    "Helpful background about the user (use naturally; do not mention as 'memory' unless it fits):",
    ...lines,
  ].join("\n")
}
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
export async function getFriendReply(
  history: ChatMessage[],
  userMessage: string,
  conversationId?: string | null
) {
  // Simulate network delay
  await new Promise((res) => setTimeout(res, 500))

  // SECTION: Task 49 — Smart memory recall (ranked + scoped)
  let memoryContext = ""
  try {
    memoryContext = await mbfBuildMemoryContext(userMessage, conversationId)
  } catch {
    // never block chat
  }

  // SECTION: (Optional) track memory usage
  // We only "touch" memories when we have context. This keeps your touch analytics useful.
  try {
    if (memoryContext) {
      // If you want strict "touch only selected memories", we can upgrade mbfBuildMemoryContext
      // to return the picked IDs. For now, keep it simple: do nothing or keep old behavior off.
      // await touchMemories(pickedIds)
    }
  } catch {
    // never block chat
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

  // SECTION: Natural memory usage (no raw formatting exposed)
  // We do NOT dump the memory block into the user response.
  // We just lightly acknowledge we’re being personalized.
  if (memoryContext) {
    // In your real LLM version, memoryContext would be injected into the prompt.
    // Since this is mock reply mode, we keep the response natural and non-robotic.
    return baseReply
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