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
  return children;
}

export function DialogHeader({children, className}) {
  return <div className={cn("p-6 pb-4", className)}>{children}</div>;
}

export function DialogContent({children, className, dir}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir={dir}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <div className={cn(
        "relative z-10 bg-card shadow-xl flex flex-col p-4 sm:p-6",
        className
      )}>
        {children}
      </div>
    </div>
  );
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
