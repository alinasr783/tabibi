import {useEffect} from "react";
import {cn} from "../../lib/utils";

export function Dialog({open, onClose, children}) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className={cn(
          "relative z-10 w-[95vw] max-w-lg rounded-[var(--radius)] border border-border bg-card shadow-xl"
        )}>
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({children, className}) {
  return <div className={cn("p-6 pb-4", className)}>{children}</div>;
}

export function DialogContent({children, className}) {
  return <div className={cn("p-6", className)}>{children}</div>;
}

export function DialogTitle({children, className}) {
  return <h1 className={cn("text-lg font-semibold leading-none tracking-tight text-foreground", className)}>{children}</h1>;
}

export function DialogFooter({children, className}) {
  return (
    <div className={cn("p-6 pt-4 flex justify-end gap-2", className)}>
      {children}
    </div>
  );
}
