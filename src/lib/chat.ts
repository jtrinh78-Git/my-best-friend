import { supabase } from "./supabase"
// SECTION: Types
export type ChatMessage = {
  id: string
  role: "user" | "friend"
  text: string
  ts: number
}

// SECTION: Mock Reply Service
export async function getFriendReply(
  history: ChatMessage[],
  userMessage: string
): Promise<string> {
  // Simulate network delay
  await new Promise((res) => setTimeout(res, 500))

  const t = userMessage.toLowerCase()

  if (t.includes("plan") || t.includes("next")) {
    return "Okay. Here are 3 steps: 1) pick the goal, 2) pick the next tiny action, 3) set a reminder."
  }

  if (t.includes("stress") || t.includes("anx")) {
    return "I hear you. Want to do a quick 30-second reset: inhale 4, hold 4, exhale 6?"
  }

  return "I’m with you. Tell me more—what’s the main thing on your mind?"
}
// SECTION: Conversation title updates

export async function updateConversationTitle(
  conversationId: string,
  title: string
) {
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