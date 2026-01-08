import { forwardRef } from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] shadow-sm",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98]",
        outline: "border border-border bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
        ghost: "bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
        link: "text-primary underline-offset-4 hover:underline bg-transparent p-0",
        danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.98] shadow-sm",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.98] shadow-sm",
      },
      size: {
        default: "h-10 px-4 py-2 rounded-[var(--radius)]",
        sm: "h-8 px-3 text-xs rounded-[var(--radius)]",
        lg: "h-12 px-6 text-base rounded-[var(--radius)]",
        xl: "h-14 px-8 text-lg rounded-[var(--radius)]",
        icon: "h-10 w-10 rounded-[var(--radius)]",
        "icon-sm": "h-8 w-8 rounded-[var(--radius)]",
        "icon-lg": "h-12 w-12 rounded-[var(--radius)]",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      fullWidth: false,
    },
  }
);

export const Button = forwardRef(function Button(
  { className, variant, size, fullWidth, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      style={{ direction: 'rtl' }}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      {...props}
    >
      {children}
    </button>
  );
});

export { buttonVariants };