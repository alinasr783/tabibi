import { getNotificationIcon } from "./notificationUtils";
import { toast } from "sonner";
import { X } from "lucide-react";

export function NotificationToast({ id, notification, onClick }) {
  // Mobile: Almost full width (handled by parent container usually, but we force it)
  // Desktop: Fixed width
  // Style: Glassmorphism, Tabibi Identity, Modern
  const Icon = getNotificationIcon(notification.type);

  return (
    <div
      className="
        relative w-full md:w-96 overflow-hidden rounded-xl border border-primary/20
        bg-background/60 backdrop-blur-sm shadow-lg
        transition-all duration-300 hover:shadow-xl hover:bg-background/70
        group select-none
        animate-in fade-in slide-in-from-top-2
      "
      dir="rtl"
    >
      {/* Close Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          toast.dismiss(id);
        }}
        className="absolute top-2 left-2 z-20 p-1 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
      >
        <X className="h-3 w-3" />
      </button>

      {/* Main Click Area */}
      <div 
        className="cursor-pointer"
        onClick={() => {
          onClick?.(notification);
          toast.dismiss(id);
        }}
      >
        {/* Glassy Gradient Background Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 pointer-events-none" />
        
        {/* Content Container */}
        <div className="relative p-4 flex items-start gap-4">
          {/* Icon with Ring */}
          <div className="shrink-0 relative">
            <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full" />
            <div className="relative z-10 bg-background/50 backdrop-blur-sm p-2 rounded-full ring-1 ring-primary/20 shadow-sm">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0 pt-0.5 space-y-1">
            <div className="flex items-center justify-between gap-2">
               <h4 className="text-sm font-bold text-foreground leading-none">
                 {notification.title}
               </h4>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {notification.message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
