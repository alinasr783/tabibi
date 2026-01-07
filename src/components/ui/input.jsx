import * as React from "react"
import { cn } from "../../lib/utils"

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      style={{ direction: 'rtl' }}
      className={cn(
        "flex h-10 w-full rounded-[var(--radius)] border-2 border-input bg-background px-3 py-2",
        "text-sm text-foreground placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "hover:border-primary/30 transition-colors duration-200",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

export { Input }

