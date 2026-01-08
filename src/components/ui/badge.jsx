import { cn } from "../../lib/utils"

export function Badge({ className, children, variant = "default", ...props }) {
  const styles =
    variant === "default"
      ? "bg-primary text-primary-foreground"
      : variant === "secondary"
      ? "bg-secondary text-secondary-foreground"
      : variant === "destructive"
      ? "bg-destructive text-destructive-foreground"
      : variant === "outline"
      ? "border border-border text-foreground"
      : variant === "success"
      ? "bg-success text-success-foreground"
      : variant === "warning"
      ? "bg-warning text-warning-foreground"
      : "bg-muted text-foreground"

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--radius)] px-2.5 py-0.5 text-xs font-medium",
        styles,
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}