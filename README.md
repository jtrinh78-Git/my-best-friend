# My Best Friend

A premium AI companion app — calm, supportive, and memory-aware.

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Styling:** TailwindCSS v4
- **Backend:** Supabase (Auth + Database + Edge Functions)
- **Routing:** React Router v7

## Project Structure

```
src/
├── components/
│   ├── auth/
│   │   └── SignInScreen.tsx      # Magic link sign-in UI
│   ├── chat/
│   │   ├── ChatHeader.tsx        # Chat title bar + actions
│   │   ├── ChatInput.tsx         # Auto-resizing message input
│   │   └── MessageList.tsx       # Message bubbles + day separators + typing indicator
│   ├── memory/
│   │   └── MemoryPanel.tsx       # Memory viewer + pin/delete
│   ├── ui/
│   │   ├── Skeleton.tsx          # Skeleton loaders
│   │   └── Toast.tsx             # Toast notification system
│   └── Sidebar.tsx               # Conversation list sidebar
├── hooks/
│   └── useAuth.ts                # Centralized auth + profile state
├── lib/
│   ├── chat.ts                   # Chat reply logic + memory context
│   ├── conversationTitles.ts     # Auto-title helpers
│   ├── events.ts                 # Calendar events + escalation logic
│   ├── memory.ts                 # Memory CRUD
│   ├── memoryCapture.ts          # Auto-extract memories from messages
│   ├── supabase.ts               # Supabase client
│   └── utils.ts                  # Tailwind class merge utility
├── pages/
│   ├── MainApp.tsx               # Main chat interface
│   └── OnboardingScreen.tsx      # First-time setup
├── types/
│   └── index.ts                  # Shared TypeScript interfaces
├── App.tsx                       # Root — auth routing
├── AuthCallback.tsx              # OAuth/Magic link callback handler
└── main.tsx                      # App entry point
```

## Getting Started

1. Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous (public) key |
