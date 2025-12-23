import { cn } from "../../lib/utils"

export function Input({ className, ...props }) {
  return (
    <input
      style={{ direction: 'rtl' }}
      className={cn(
        "flex h-10 w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        className
      )}
      {...props}
    />
  )
}

