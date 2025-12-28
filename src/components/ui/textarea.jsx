import { cn } from "../../lib/utils"

export function Textarea({ className, ...props }) {
  return (
    <textarea
      style={{ direction: 'rtl' }}
      className={cn(
        "flex min-h-[80px] w-full rounded-[var(--radius)] border-2 border-input bg-background px-3 py-2",
        "text-sm text-foreground placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "hover:border-primary/30 transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted",
        className
      )}
      {...props}
    />
  )
}