import { supabase } from "./supabase"

// SECTION: Types
export type MemoryRow = {
  id: string
  user_id: string
  conversation_id: string | null
  category: string
  key: string | null
  content: string
  importance: number
  source: "auto" | "user" | "import" | string
  pinned: boolean
  last_accessed_at: string | null
  created_at: string
  updated_at: string
}

export type CreateMemoryInput = {
  conversationId?: string | null
  category?: string
  key?: string | null
  content: string
  importance?: number
  source?: "auto" | "user" | "import"
  pinned?: boolean
}

// SECTION: Helpers
async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const uid = data.session?.user?.id
  if (!uid) throw new Error("No active session found. Please sign in again.")
  return uid
}

// SECTION: Fetch memories
export async function fetchTopMemories(opts?: {
  limit?: number
  conversationId?: string | null
}): Promise<MemoryRow[]> {
  const uid = await requireUserId()
  const limit = opts?.limit ?? 12
  const conversationId = opts?.conversationId ?? null

  let q = supabase
    .from("memories")
    .select(
      "id, user_id, conversation_id, category, key, content, importance, source, pinned, last_accessed_at, created_at, updated_at"
    )
    .eq("user_id", uid)

  if (conversationId) {
    q = q.eq("conversation_id", conversationId)
  }

  const { data, error } = await q
    .order("pinned", { ascending: false })
    .order("importance", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as MemoryRow[]
}

// SECTION: Touch memories
export async function touchMemories(ids: string[]) {
  const uniqueIds = Array.from(new Set((ids || []).filter(Boolean)))
  if (uniqueIds.length === 0) return

  const { data: userRes } = await supabase.auth.getUser()
  const userId = userRes.user?.id
  if (!userId) throw new Error("Not signed in")

  // SECTION: Load current importance/pinned so we can boost safely
  const { data: rows, error: fetchErr } = await supabase
    .from("memories")
    .select("id, pinned, importance")
    .eq("user_id", userId)
    .in("id", uniqueIds)

  if (fetchErr) throw fetchErr

  const nowIso = new Date().toISOString()

  // SECTION: Boost rule
  // - pinned: no boost (pinned already wins ranking)
  // - else: +2 (cap 100)
  const updates = (rows ?? []).map((r: any) => {
    const pinned = !!r.pinned
    const cur = typeof r.importance === "number" ? r.importance : 50
    const next = pinned ? cur : Math.min(100, cur + 2)

    return {
      id: r.id,
      updated_at: nowIso,
      importance: next,
    }
  })

  if (updates.length === 0) return

  // SECTION: Apply updates (small batch: usually 1–5 ids)
  // We do per-row updates to avoid relying on server-side arithmetic.
  const results = await Promise.all(
    updates.map((u) =>
      supabase
        .from("memories")
        .update({ updated_at: u.updated_at, importance: u.importance })
        .eq("user_id", userId)
        .eq("id", u.id)
    )
  )

  const firstErr = results.find((r) => r.error)?.error
  if (firstErr) throw firstErr
}

// SECTION: Create memory
export async function createMemory(input: CreateMemoryInput): Promise<MemoryRow> {
  const uid = await requireUserId()

  const payload = {
    user_id: uid,
    conversation_id: input.conversationId ?? null,
    category: (input.category ?? "general").trim() || "general",
    key: input.key ?? null,
    content: input.content.trim(),
    importance: input.importance ?? 50,
    source: input.source ?? "auto",
    pinned: input.pinned ?? false,
  }

  if (!payload.content) throw new Error("Memory content is required.")

  const { data, error } = await supabase
    .from("memories")
    .insert(payload)
    .select(
      "id, user_id, conversation_id, category, key, content, importance, source, pinned, last_accessed_at, created_at, updated_at"
    )
    .single()

  if (error) throw error
  return data as MemoryRow
}

// SECTION: Pin/unpin
export async function setMemoryPinned(memoryId: string, pinned: boolean): Promise<void> {
  const uid = await requireUserId()

  const { error } = await supabase
    .from("memories")
    .update({ pinned })
    .eq("user_id", uid)
    .eq("id", memoryId)

  if (error) throw error
}

// SECTION: Delete memory
export async function deleteMemory(memoryId: string): Promise<void> {
  const uid = await requireUserId()

  const { error } = await supabase.from("memories").delete().eq("user_id", uid).eq("id", memoryId)

  if (error) throw error
}