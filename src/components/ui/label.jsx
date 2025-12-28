import { cn } from "../../lib/utils"

export function Label({ htmlFor, className, children, ...props }) {
  return (
    <label
      style={{ direction: 'rtl' }}
      htmlFor={htmlFor}
      className={cn(
        "text-sm font-medium leading-none text-foreground",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    >
      {children}
    </label>
  )
}