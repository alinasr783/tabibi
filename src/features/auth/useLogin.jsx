import { useMutation, useQueryClient } from "@tanstack/react-query"
import { login } from "../../services/apiAuth"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { AlertTriangle, CheckCircle2, X } from "lucide-react"

export default function useLogin() {
    const queryClient = useQueryClient()
    const navigate = useNavigate()

    const showNotificationToast = (title, message, type = "error", action = null) => {
        toast.custom((id) => (
          <div
            className="
              relative w-full md:w-96 overflow-hidden rounded-xl border border-primary/20
              bg-background/80 backdrop-blur-md shadow-lg p-4 flex items-start gap-4
              transition-all duration-300 select-none animate-in fade-in slide-in-from-top-2
            "
            dir="rtl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 pointer-events-none" />
            
            <div className="shrink-0 relative">
              <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full" />
              <div className="relative z-10 bg-background/50 backdrop-blur-sm p-2 rounded-full ring-1 ring-primary/20 shadow-sm">
                {type === "error" ? (
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                )}
              </div>
            </div>
    
            <div className="flex-1 min-w-0 pt-0.5 space-y-1">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-bold text-foreground leading-none">
                  {title}
                </h4>
                {action && (
                  <button
                    onClick={() => {
                      action.onClick();
                      toast.dismiss(id);
                    }}
                    className="shrink-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-sm hover:bg-primary/90 transition-all active:scale-95 flex items-center gap-1 w-fit"
                  >
                    {action.label}
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {message}
              </p>
            </div>
    
            <button 
              onClick={() => toast.dismiss(id)}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors relative z-20"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ), {
          duration: 3000,
          position: 'top-center'
        });
      };

    return useMutation({
        mutationFn: login,
        onSuccess: (data) => {
            // Set user data and invalidate any cached user data
            queryClient.setQueryData(["user"], data.user)
            queryClient.invalidateQueries({ queryKey: ["user"] })
            
            showNotificationToast(
                "تم بنجاح",
                "أهلاً بك مرة أخرى في طبيبي",
                "success"
            )
            
            navigate("/dashboard", { replace: true })
        },
        onError: (error) => {
            if (error.code === "EMAIL_NOT_FOUND") {
                showNotificationToast(
                    "الإيميل ده مش موجود مسبقا",
                    "لو معندكش حساب جرب اعمل حساب جديد",
                    "error",
                    {
                        label: "انشاء حساب",
                        onClick: () => navigate("/signup")
                    }
                )
                return;
            }

            // Error messages are already in Egyptian Arabic from apiAuth.js
            showNotificationToast(
                "فشل تسجيل الدخول",
                error.message || "حصل خطأ في تسجيل الدخول، جرب تاني كمان شوية",
                "error"
            )
        },
    })
}