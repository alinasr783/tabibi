import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Home, LogIn } from "lucide-react";
import supabase from "../services/supabase";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";

export default function EmailVerify() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const tokenHash = params.get("token_hash") || params.get("token") || "";
  const type = params.get("type") || "signup";

  const prettyError = useMemo(() => {
    if (errorMessage) return errorMessage;
    if (status !== "error") return "";
    return "الرابط غير صالح أو انتهت صلاحيته. جرّب تبعت طلب تأكيد جديد.";
  }, [errorMessage, status]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!tokenHash) {
        setStatus("error");
        setErrorMessage("الرابط ناقص بيانات التأكيد.");
        return;
      }

      setStatus("loading");
      setErrorMessage("");

      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash: tokenHash,
      });

      if (cancelled) return;

      if (error) {
        setStatus("error");
        setErrorMessage(error.message || "");
        return;
      }

      setStatus("success");
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [tokenHash, type]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">جاري تأكيد الحساب...</p>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md p-8">
        <div className="text-center">
          <div
            className={
              "mx-auto mb-4 size-14 rounded-full flex items-center justify-center " +
              (status === "success"
                ? "bg-primary/10 text-primary"
                : "bg-destructive/10 text-destructive")
            }
          >
            {status === "success" ? (
              <CheckCircle2 className="size-7" />
            ) : (
              <AlertTriangle className="size-7" />
            )}
          </div>

          {status === "success" ? (
            <>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                تم تأكيد حسابك بنجاح
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                تقدر دلوقتي تسجل دخول وتبدأ تستخدم Tabibi.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                تعذر تأكيد الحساب
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {prettyError}
              </p>
            </>
          )}

          <div className="mt-6 grid grid-cols-1 gap-3">
            <Button onClick={() => navigate("/login")} fullWidth>
              <LogIn className="size-4" />
              تسجيل الدخول
            </Button>
            <Button variant="outline" onClick={() => navigate("/")} fullWidth>
              <Home className="size-4" />
              العودة للرئيسية
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

