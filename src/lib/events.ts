import { supabase } from "./supabase"

export type EventRow = {
  id: string
  user_id: string
  title: string
  start_at: string
  end_at: string | null
  all_day: boolean
  importance: number
  is_critical: boolean
  missed_count: number
  escalation_level: number
  completed_at: string | null
  deleted_at: string | null
}

/**
 * Create Event
 */
export async function createEvent(input: {
  title: string
  start_at: string
  end_at?: string | null
  importance?: number
  is_critical?: boolean
}) {
  const { data: userRes } = await supabase.auth.getUser()
  const userId = userRes.user?.id
  if (!userId) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("events")
    .insert({
      user_id: userId,
      title: input.title,
      start_at: input.start_at,
      end_at: input.end_at ?? null,
      importance: input.importance ?? 3,
      is_critical: input.is_critical ?? false,
    })
    .select()
    .single()

  if (error) throw error
  return data as EventRow
}

/**
 * List Upcoming Events
 */
export async function listUpcomingEvents(limit = 20) {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .is("deleted_at", null)
    .is("completed_at", null)
    .gte("start_at", now)
    .order("start_at", { ascending: true })
    .limit(limit)

  if (error) throw error
  return data as EventRow[]
}

/**
 * Complete Event
 */
export async function completeEvent(eventId: string) {
  const { error } = await supabase
    .from("events")
    .update({
      completed_at: new Date().toISOString(),
      escalation_level: 0,
    })
    .eq("id", eventId)

  if (error) throw error
}
// SECTION: Missed + escalation helpers
export async function markEventMissed(eventId: string) {
  // increments missed_count, bumps escalation_level, clears completed_at
  const { data: current, error: readErr } = await supabase
    .from("events")
    .select("missed_count, escalation_level")
    .eq("id", eventId)
    .single()

  if (readErr) throw readErr

  const missedCount = (current?.missed_count ?? 0) + 1
  const nextEscalationLevel = Math.min(3, (current?.escalation_level ?? 0) + 1)

  const { error } = await supabase
    .from("events")
    .update({
      missed_count: missedCount,
      escalation_level: nextEscalationLevel,
      completed_at: null,
    })
    .eq("id", eventId)

  if (error) throw error

  return { missedCount, escalationLevel: nextEscalationLevel }
}

export async function setLastEscalated(eventId: string) {
  const { error } = await supabase
    .from("events")
    .update({ last_escalated_at: new Date().toISOString() })
    .eq("id", eventId)

  if (error) throw error
}

export async function listDueEvents(windowMinutes = 10, limit = 25) {
  // "Due" = start_at is within the last X minutes up to now, not completed, not deleted
  const now = new Date()
  const start = new Date(now.getTime() - windowMinutes * 60 * 1000).toISOString()
  const end = now.toISOString()

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .is("deleted_at", null)
    .is("completed_at", null)
    .gte("start_at", start)
    .lte("start_at", end)
    .order("start_at", { ascending: true })
    .limit(limit)

  if (error) throw error
  return data as EventRow[]
}