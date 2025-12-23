import { cn } from "../../lib/utils"

export function Badge({ className, children, variant = "default", ...props }) {
  const styles =
    variant === "default"
      ? "bg-primary text-primary-foreground"
      : variant === "secondary"
      ? "bg-secondary text-secondary-foreground"
      : variant === "outline"
      ? "border border-border"
      : "bg-muted text-foreground"

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles,
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}