import { createMemory, fetchTopMemories } from "./memory"

// SECTION: Types
type Candidate = {
  category: string
  key: string | null
  content: string
  importance: number
}

// SECTION: Helpers
function cleanName(s: string) {
  return s.replace(/[^a-zA-Z'\-\s]/g, "").trim()
}

function norm(s: string) {
  return s.toLowerCase().trim().replace(/\s+/g, " ")
}

function extractCandidates(textRaw: string): Candidate[] {
  const text = textRaw.trim()
  if (!text) return []

  const t = text.toLowerCase()
  const out: Candidate[] = []

  // SECTION: Preferred name
  // "my name is X" / "call me X"
  {
    const m1 = text.match(/\bmy name is\s+([A-Za-z][A-Za-z'\-\s]{1,40})\b/i)
    const m2 = text.match(/\bcall me\s+([A-Za-z][A-Za-z'\-\s]{1,40})\b/i)
    const raw = m1?.[1] ?? m2?.[1]
    if (raw) {
      const name = cleanName(raw)
      if (name && name.length <= 40) {
        out.push({
          category: "identity",
          key: "preferred_name",
          content: `User prefers to be called "${name}".`,
          importance: 90,
        })
      }
    }
  }

  // SECTION: Relationships (very simple)
  // "my wife is X", "my husband is X", "my girlfriend is X", "my boyfriend is X"
  {
    const rel = text.match(/\bmy\s+(wife|husband|girlfriend|boyfriend)\s+is\s+([A-Za-z][A-Za-z'\-\s]{1,40})\b/i)
    if (rel?.[1] && rel?.[2]) {
      const who = rel[1].toLowerCase()
      const name = cleanName(rel[2])
      if (name) {
        out.push({
          category: "relationships",
          key: `${who}_name`,
          content: `User's ${who} is "${name}".`,
          importance: 75,
        })
      }
    }
  }

  // SECTION: Preferences (like/prefer/favorite/hate)
  // Keep these as general memories (not too many)
  {
    const prefer = text.match(/\b(i prefer|i like|my favorite)\s+(.{3,80})/i)
    const hate = text.match(/\b(i hate|i dislike)\s+(.{3,80})/i)

    if (prefer?.[2]) {
      const thing = prefer[2].trim().replace(/[.?!]+$/, "")
      if (thing.length <= 80) {
        out.push({
          category: "preferences",
          key: null,
          content: `User prefers/likes: ${thing}.`,
          importance: 60,
        })
      }
    }

    if (hate?.[2]) {
      const thing = hate[2].trim().replace(/[.?!]+$/, "")
      if (thing.length <= 80) {
        out.push({
          category: "preferences",
          key: null,
          content: `User dislikes: ${thing}.`,
          importance: 60,
        })
      }
    }
  }

  // SECTION: Goals / Intent
  {
    const goal1 = text.match(/\bmy goal is\s+(.{5,120})/i)
    const goal2 = text.match(/\b(i want to|i'm trying to|im trying to)\s+(.{5,120})/i)

    const g =
      goal1?.[1]?.trim() ??
      (goal2?.[2] ? goal2[2].trim() : null)

    if (g) {
      const goal = g.replace(/[.?!]+$/, "")
      if (goal.length <= 120) {
        out.push({
          category: "goals",
          key: null,
          content: `User goal: ${goal}.`,
          importance: 70,
        })
      }
    }
  }

  // SECTION: Guardrails (avoid saving tiny/low-signal text)
  // Don’t store if message is extremely short or generic
  if (t.length < 8) return []

  return out
}

// SECTION: Public API
export async function saveImportantMemoriesFromUserMessage(opts: {
  text: string
  conversationId?: string | null
}): Promise<{ saved: number }> {
  const candidates = extractCandidates(opts.text)
  if (candidates.length === 0) return { saved: 0 }

  // Fetch a chunk to dedupe (cheap + safe)
  const existing = await fetchTopMemories({ limit: 50 })
  const existingNorm = new Set(existing.map((m) => norm(m.content)))
  const existingKeyNorm = new Set(
    existing
      .filter((m) => m.key)
      .map((m) => `${norm(String(m.key))}::${norm(m.content)}`)
  )

  let saved = 0

  for (const c of candidates) {
    const contentKey = norm(c.content)
    const keySig = c.key ? `${norm(c.key)}::${contentKey}` : null

    // Dedupe
    if (existingNorm.has(contentKey)) continue
    if (keySig && existingKeyNorm.has(keySig)) continue

    try {
      await createMemory({
        conversationId: opts.conversationId ?? null,
        category: c.category,
        key: c.key,
        content: c.content,
        importance: c.importance,
        source: "auto",
        pinned: false,
      })

      saved++
      existingNorm.add(contentKey)
      if (keySig) existingKeyNorm.add(keySig)
    } catch {
      // Never block chat on memory writes
    }
  }

  return { saved }
}