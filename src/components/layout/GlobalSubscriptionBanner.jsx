import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Sparkles, Zap } from "lucide-react";
import { useSubscriptionStatus } from "../../features/auth/useSubscriptionStatus";
import { Button } from "../ui/button";

export default function GlobalSubscriptionBanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: status, isLoading } = useSubscriptionStatus();

  if (isLoading || !status || status.status === "active" || status.status === "error") {
    return null;
  }

  // Don't show the banner on the subscriptions page
  if (location.pathname === "/subscriptions") {
    return null;
  }

  const isExpired = status.status === "expired";
  const isNone = status.status === "none";

  if (!isExpired && !isNone) return null;

  return (
    <div className={`w-full py-2.5 px-4 flex flex-col items-center justify-center gap-2.5 text-xs sm:text-sm font-medium animate-in slide-in-from-top duration-500 shadow-sm ${
      isExpired 
        ? "bg-red-600 text-white" 
        : "bg-primary text-primary-foreground"
    }`}>
      <div className="flex items-center gap-2 text-center">
        {isExpired ? (
          <Zap className="size-4 fill-current animate-pulse shrink-0" />
        ) : (
          <Sparkles className="size-4 fill-current shrink-0" />
        )}
        <p className="tracking-tight leading-tight">
          {isExpired 
            ? "الاشتراك خلص.. جدد دلوقتي عشان متوقفش شغل عيادتك!" 
            : "لسه معملتش باقة؟ اشترك وفك كل مميزات طبيبي لعيادتك."}
        </p>
      </div>
      
      <Button 
        variant="secondary" 
        size="sm" 
        onClick={() => navigate("/subscriptions")}
        className="h-8 px-5 text-[11px] sm:text-xs font-bold gap-2 rounded-full bg-white text-black hover:bg-white/90 border-none transition-all active:scale-95 shadow-md"
      >
        {isExpired ? "جدد حالاً" : "اشترك دلوقتي"}
        <ArrowLeft className="size-3.5" />
      </Button>
    </div>
  );
}
