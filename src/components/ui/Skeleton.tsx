import { cn } from "../../lib/utils"

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-zinc-800/60",
        className
      )}
    />
  )
}

export function ChatSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-5 py-4">
      {/* Friend message */}
      <div className="flex items-end gap-3">
        <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      {/* User message */}
      <div className="flex items-end justify-end gap-3">
        <div className="flex flex-col items-end gap-2">
          <Skeleton className="h-4 w-52" />
        </div>
      </div>
      {/* Friend message */}
      <div className="flex items-end gap-3">
        <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
      {/* User message */}
      <div className="flex items-end justify-end gap-3">
        <div className="flex flex-col items-end gap-2">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    </div>
  )
}

export function MemorySkeleton() {
  return (
    <div className="flex flex-col gap-2 p-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-zinc-800 p-3 flex flex-col gap-2">
          <div className="flex gap-2">
            <Skeleton className="h-4 w-16 rounded-full" />
            <Skeleton className="h-4 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  )
}

export function SidebarSkeleton() {
  return (
    <div className="flex flex-col gap-2 px-2 py-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-2 rounded-xl px-3 py-2">
          <Skeleton className="h-2 w-2 rounded-full shrink-0" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  )
}
