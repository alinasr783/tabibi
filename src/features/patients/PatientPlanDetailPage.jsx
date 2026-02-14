import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { ArrowLeft, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { SkeletonLine } from "../../components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { formatCurrency } from "../../lib/utils";
import usePatientPlan from "./usePatientPlan";
import { useUpdatePatientPlan } from "./usePatientPlans";
import { createVisit } from "../../services/apiVisits";
import { createFinancialRecord } from "../../services/apiFinancialRecords";

export default function PatientPlanDetailPage() {
  const { patientId, planId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: plan, isLoading, error } = usePatientPlan(planId);
  const { mutate: updatePlan } = useUpdatePatientPlan();
  const [completedSessions, setCompletedSessions] = useState(0);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [lastVisitId, setLastVisitId] = useState(null);

  // Initialize completedSessions from plan data
  useEffect(() => {
    if (plan) {
      setCompletedSessions(plan.completed_sessions || 0);
    }
  }, [plan]);

  const statusMap = {
    active: { label: "نشطة", className: "bg-primary text-primary-foreground" },
    completed: { label: "مكتملة", className: "bg-blue-800 text-white font-bold border border-blue-900 shadow-sm" },
    cancelled: { label: "ملغية", className: "bg-destructive text-destructive-foreground" },
  };

  // Function to handle completing a session
  const handleCompleteSession = async () => {
    // Check if plan is active before allowing session completion
    if (plan?.status !== 'active') {
      toast.error("لا يمكن إكمال جلسة لخطة ملغية أو مكتملة");
      return;
    }
    
    if (completedSessions < (plan?.total_sessions || 0)) {
      try {
        const visitResult = await createVisit({
          patient_id: patientId,
          patient_plan_id: planId,
          diagnosis: "جلسة علاجية",
          notes: "جلسة مكتملة ضمن خطة العلاج"
        });

        const newCompletedSessions = completedSessions + 1;
        setCompletedSessions(newCompletedSessions);

        toast.success("تم تسجيل الجلسة بنجاح");

        queryClient.invalidateQueries({ queryKey: ['patientPlan', planId] });
        queryClient.invalidateQueries({ queryKey: ['patientPlans'] });
        queryClient.invalidateQueries({ queryKey: ['visits'] });
        queryClient.invalidateQueries({ queryKey: ["patientFinancialData", Number(patientId)] });

        const promptEnabled = !!plan?.advanced_settings?.paymentPrompt?.enabled;
        if (promptEnabled) {
          setLastVisitId(visitResult?.id || null);
          setPaymentEnabled(false);
          setPaymentAmount("");
          setShowPaymentDialog(true);
        }
      } catch (error) {
        console.log("ERROR in PatientPlanDetailPage:", error.message);
        toast.error("حدث خطأ أثناء تسجيل الجلسة");
      }
    }
  };

  const submitSessionPayment = async () => {
    if (!paymentEnabled) {
      setShowPaymentDialog(false);
      return;
    }
    const amt = Number(paymentAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("أدخل مبلغ صحيح");
      return;
    }
    try {
      await createFinancialRecord({
        visit_id: lastVisitId,
        patient_id: Number(patientId),
        patient_plan_id: Number(planId),
        amount: amt,
        type: "income",
        reference_key: lastVisitId ? `plan:${planId}:visit:${lastVisitId}:payment` : `plan:${planId}:payment:${Date.now()}`,
        description: `دفعة جلسة علاجية - ${plan?.treatment_templates?.name || "خطة علاجية"}`,
        recorded_at: new Date().toISOString(),
      });
      toast.success("تم تسجيل الدفعة");
      queryClient.invalidateQueries({ queryKey: ["patientFinancialData", Number(patientId)] });
      queryClient.invalidateQueries({ queryKey: ["patientFinanceLedger", Number(patientId)] });
      queryClient.invalidateQueries({ queryKey: ["patientFinanceSummary", Number(patientId)] });
      queryClient.invalidateQueries({ queryKey: ["financialRecords"] });
      queryClient.invalidateQueries({ queryKey: ["financialStats"] });
      setShowPaymentDialog(false);
    } catch (e) {
      toast.error("حدث خطأ أثناء تسجيل الدفعة");
    }
  };

  // Function to cancel the plan
  const handleCancelPlan = () => {
    // Check if all sessions are completed
    if (completedSessions >= (plan?.total_sessions || 0)) {
      toast.error("لا يمكن إلغاء الخطة بعد إكمال جميع الجلسات");
      return;
    }
    
    updatePlan(
      { id: planId, payload: { status: 'cancelled' } },
      {
        onSuccess: () => {
          toast.success("تم إلغاء الخطة العلاجية بنجاح");
          // Invalidate the patient plan query to refresh the UI
          queryClient.invalidateQueries({ queryKey: ['patientPlan', planId] });
          queryClient.invalidateQueries({ queryKey: ['patientPlans'] });
        },
        onError: (error) => {
          toast.error("حدث خطأ أثناء إلغاء الخطة");
          console.error("Error cancelling plan:", error);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="size-4" />
            رجوع
          </Button>
        </div>

        <Card>
          <CardHeader>
            <SkeletonLine width={200} height={24} />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex justify-between items-center">
                  <SkeletonLine width={100} height={16} />
                  <SkeletonLine width={150} height={16} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="size-4" />
            رجوع
          </Button>
        </div>

        <div className="text-center py-8 text-red-500">
          <p>حدث خطأ أثناء تحميل تفاصيل الخطة: {error.message}</p>
        </div>
      </div>
    );
  }

  // Create steps for sessions
  const sessionSteps = [];
  const totalSessions = plan?.total_sessions || 0;
  for (let i = 1; i <= totalSessions; i++) {
    sessionSteps.push(i);
  }

  // Check if plan is cancelled
  const isPlanCancelled = plan?.status === 'cancelled';

  return (
    <div className="space-y-6" dir="rtl">
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent dir="rtl" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>تسجيل دفعة للجلسة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">هل دفع المريض الآن؟</div>
                <div className="text-xs text-muted-foreground">فعّلها لإضافة مبلغ مدفوع لهذه الجلسة</div>
              </div>
              <Switch checked={paymentEnabled} onCheckedChange={setPaymentEnabled} />
            </div>
            {paymentEnabled ? (
              <div className="space-y-2">
                <Label>المبلغ المدفوع (جنيه)</Label>
                <Input type="number" min="0" step="0.01" dir="ltr" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowPaymentDialog(false)}>
              إغلاق
            </Button>
            <Button type="button" onClick={submitSessionPayment}>
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          className="gap-2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="size-4" />
          رجوع
        </Button>
      </div>

      <Card>
        <CardHeader>
          <h1 className="text-2xl font-bold">تفاصيل الخطة العلاجية</h1>
          <p className="text-muted-foreground">
            عرض تفاصيل الخطة العلاجية المخصصة للمريض
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Plan Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-[var(--radius)] border border-border p-4">
                <h3 className="font-semibold mb-3">معلومات الخطة</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">اسم الخطة:</span>
                    <span>{plan?.treatment_templates?.name || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">تاريخ الإنشاء:</span>
                    <span>
                      {plan?.created_at 
                        ? format(new Date(plan.created_at), "dd MMMM yyyy", { locale: ar })
                        : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الحالة:</span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      statusMap[plan?.status]?.variant === "default" 
                        ? "bg-primary text-primary-foreground" 
                        : statusMap[plan?.status]?.variant === "outline" 
                          ? "border border-input bg-background" 
                          : "bg-destructive text-destructive-foreground"
                    }`}>
                      {statusMap[plan?.status]?.label || plan?.status || "-"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-[var(--radius)] border border-border p-4">
                <h3 className="font-semibold mb-3">تفاصيل الدفع</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">عدد الجلسات المحددة:</span>
                    <span>{plan?.total_sessions || 0} جلسة</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">سعر الجلسة:</span>
                    <span>{formatCurrency(plan?.treatment_templates?.session_price || 0)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-semibold">السعر الإجمالي:</span>
                    <span className="font-bold text-primary">{formatCurrency(plan?.total_price || 0)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Session Progress Steps */}
            <div className="rounded-[var(--radius)] border border-border p-4">
              <h3 className="font-semibold mb-3">تقدم الجلسات</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>الجلسات المنجزة: {completedSessions} من {totalSessions}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0}%
                  </span>
                </div>
                
                {/* Progress Steps */}
                <div className="flex flex-wrap gap-2 justify-center">
                  {sessionSteps.map((step) => (
                    <div key={step} className="flex flex-col items-center">
                      <div 
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          step <= completedSessions
                            ? "bg-green-500 text-white"
                            : isPlanCancelled
                              ? "bg-gray-400 text-white"
                              : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        {step}
                      </div>
                      {step < totalSessions && (
                        <div 
                          className={`w-6 h-1 mt-2 ${
                            step <= completedSessions 
                              ? "bg-green-500" 
                              : isPlanCancelled
                                ? "bg-gray-400"
                                : "bg-gray-200"
                          }`}
                        ></div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Complete Session Button */}
                <div className="mt-6 flex justify-center">
                  <Button 
                    onClick={handleCompleteSession}
                    disabled={completedSessions >= totalSessions || isPlanCancelled}
                  >
                    {isPlanCancelled 
                      ? "الخطة ملغية" 
                      : completedSessions >= totalSessions 
                        ? "اكتملت جميع الجلسات" 
                        : "إكمال جلسة"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={handleCompleteSession}
                disabled={completedSessions >= totalSessions || isPlanCancelled}
              >
                {isPlanCancelled 
                  ? "الخطة ملغية" 
                  : completedSessions >= totalSessions 
                    ? "اكتملت جميع الجلسات" 
                    : "إكمال جلسة"}
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleCancelPlan}
                disabled={isPlanCancelled || completedSessions >= (plan?.total_sessions || 0)}
              >
                {isPlanCancelled 
                  ? "الخطة ملغية" 
                  : completedSessions >= (plan?.total_sessions || 0)
                    ? "اكتملت جميع الجلسات"
                    : "إلغاء الخطة"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
