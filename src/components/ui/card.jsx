import { cn } from "../../lib/utils"

export function Card({ className, children, ...props }) {
  return (
    <div className={cn("rounded-[var(--radius)] border border-border bg-card", className)} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ className, children }) {
  return <div className={cn("p-6", className)}>{children}</div>
}

export function CardContent({ className, children }) {
  return <div className={cn("p-6 pt-0", className)}>{children}</div>
}

export function CardDescription({ className, children }) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>{children}</p>
  )
}

export function CardTitle({ className, children }) {
  return (
    <h3 className={cn("text-lg font-semibold leading-none tracking-tight", className)}>
      {children}
    </h3>
  )
}

export function CardFooter({ className, children }) {
  return <div className={cn("p-6 pt-0", className)}>{children}</div>
}

