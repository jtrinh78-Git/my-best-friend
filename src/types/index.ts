// ─── Profile ────────────────────────────────────────────────────────────────
export interface Profile {
  id: string
  first_name: string | null
  timezone: string | null
  default_friend_name: string | null
  onboarding_completed: boolean
  onboarding_step: string | null
  created_at: string
  updated_at: string
}

// ─── Chat ────────────────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string
  role: "user" | "friend"
  text: string
  ts: number
}

export interface Conversation {
  id: string
  title: string | null
  created_at: string
  updated_at: string
}

// ─── Memory ──────────────────────────────────────────────────────────────────
export interface MemoryRow {
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

export interface CreateMemoryInput {
  conversationId?: string | null
  category?: string
  key?: string | null
  content: string
  importance?: number
  source?: "auto" | "user" | "import"
  pinned?: boolean
}

// ─── Events ──────────────────────────────────────────────────────────────────
export interface EventRow {
  id: string
  user_id: string
  title: string
  start_at: string
  end_at: string | null
  importance: number
  is_critical: boolean
  completed_at: string | null
  deleted_at: string | null
  missed_count: number
  escalation_level: number
  last_escalated_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateEventInput {
  title: string
  start_at: string
  end_at?: string | null
  importance?: number
  is_critical?: boolean
}

// ─── Escalation ──────────────────────────────────────────────────────────────
export type EscalationAction =
  | { type: "none"; reason: string }
  | { type: "push"; reason: string }
  | { type: "sms"; reason: string }
