import { cn } from "../../lib/utils"
import { forwardRef } from "react"

export const Checkbox = forwardRef(({ className, checked, onCheckedChange, ...props }, ref) => {
  return (
    <input
      type="checkbox"
      ref={ref}
      checked={checked}
      onChange={(e) => onCheckedChange && onCheckedChange(e.target.checked)}
      className={cn(
        "h-4 w-4 rounded border-2 border-input bg-background text-primary accent-primary cursor-pointer",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
        "hover:border-primary/50 transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "checked:bg-primary checked:border-primary",
        className
      )}
      {...props}
    />
  )
})