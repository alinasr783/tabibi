import { useNavigate } from "react-router-dom";
import { CheckCircle2, LayoutDashboard, LogIn, Home } from "lucide-react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import useUser from "../features/auth/useUser";

export default function EmailConfirmed() {
  const navigate = useNavigate();
  const { data: user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 size-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <CheckCircle2 className="size-7" />
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">
            تم تأكيد حسابك بنجاح
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            دلوقتي تقدر تكمل وتدخل على حسابك في Tabibi.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3">
            {user ? (
              <>
                <Button onClick={() => navigate("/dashboard")} fullWidth>
                  <LayoutDashboard className="size-4" />
                  الذهاب للوحة التحكم
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/login")}
                  fullWidth
                >
                  <LogIn className="size-4" />
                  صفحة تسجيل الدخول
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => navigate("/login")} fullWidth>
                  <LogIn className="size-4" />
                  تسجيل الدخول
                </Button>
                <Button variant="outline" onClick={() => navigate("/")} fullWidth>
                  <Home className="size-4" />
                  العودة للرئيسية
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

