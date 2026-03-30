import { useMutation, useQueryClient } from "@tanstack/react-query"
import { signup } from "../../services/apiAuth"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"
import { AlertTriangle, CheckCircle2, X } from "lucide-react"

export default function useSignup() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()

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
        mutationFn: signup,
        onSuccess: (data) => {
            // Check if email confirmation is required
            const isEmailConfirmed = data?.user?.identities?.[0]?.identity_data?.email_verified || data?.session;
            
            if (!isEmailConfirmed) {
                showNotificationToast(
                    "تم إنشاء الحساب",
                    "فاضل خطوة واحدة! روح للأوتلوك أو الجيميل وأكد الإيميل بتاعك عشان تقدر تدخل.",
                    "success"
                )
                return;
            }

            queryClient.setQueryData(["user"], data.user)
            queryClient.invalidateQueries({ queryKey: ["user"] })
            
            showNotificationToast(
                "تم بنجاح",
                "تم إنشاء حسابك بنجاح، أهلاً بك في طبيبي",
                "success"
            )
            
            navigate("/dashboard", { replace: true })
        },
        onError: (error) => {
            const isEmailExists = 
                error.code === "EMAIL_ALREADY_EXISTS" || 
                error.message?.includes("الإيميل ده موجود قبل كده") ||
                error.message?.includes("already registered") ||
                error.message?.includes("already exists");

            if (isEmailExists) {
                showNotificationToast(
                    "الإيميل ده موجود مسبقا",
                    "لو بتاعك جرب تسجل دخول بيه",
                    "error",
                    {
                        label: "سجل دخول",
                        onClick: () => navigate("/login")
                    }
                )
                return;
            }

            showNotificationToast(
                "فشل إنشاء الحساب",
                error.message || "حصل خطأ في إنشاء الحساب، جرب تاني كمان شوية",
                "error"
            )
        },
    })
}