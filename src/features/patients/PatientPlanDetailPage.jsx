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
import { formatCurrency } from "../../lib/utils";
import usePatientPlan from "./usePatientPlan";
import { useUpdatePatientPlan } from "./usePatientPlans";
import { createVisit } from "../../services/apiVisits";
import { createAppointment } from "../../services/apiAppointments";

export default function PatientPlanDetailPage() {
  const { patientId, planId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: plan, isLoading, error } = usePatientPlan(planId);
  const { mutate: updatePlan } = useUpdatePatientPlan();
  const [completedSessions, setCompletedSessions] = useState(0);

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
        // First, create a visit record linked to this patient plan
        console.log("=== PATIENT PLAN DEBUG ===");
        console.log("1. Creating visit for patient plan:", { patientId, planId });
        
        const visitResult = await createVisit({
          patient_id: patientId,
          patient_plan_id: planId,
          diagnosis: "جلسة علاجية",
          notes: "جلسة مكتملة ضمن خطة العلاج"
        });
        
        console.log("2. Visit created successfully:", visitResult.id);
        
        // Calculate session price
        const sessionPrice = plan?.treatment_templates?.session_price || 
          (plan?.total_price > 0 && plan?.total_sessions > 0 ? 
          plan.total_price / plan.total_sessions : 0);
        
        console.log("3. Session price calculated:", sessionPrice);
        
        // Create an appointment for this session
        console.log("4. Creating appointment for session");
        const appointmentResult = await createAppointment({
          patient_id: patientId,
          date: new Date().toISOString(),
          notes: `جلسة علاجية - ${plan?.treatment_templates?.name || 'خطة علاجية'}`,
          price: sessionPrice,
          status: 'completed', // Explicitly set status to completed
          from: 'clinic'
        });
        
        console.log("5. Appointment created successfully:", appointmentResult.id);
        
        // Then update the plan's completed sessions count
        const newCompletedSessions = completedSessions + 1;
        setCompletedSessions(newCompletedSessions);
        
        // Prepare update payload
        const payload = { completed_sessions: newCompletedSessions };
        
        // If all sessions are completed, also update status to 'completed'
        if (newCompletedSessions >= (plan?.total_sessions || 0)) {
          payload.status = 'completed';
        }
        
        // Update the database
        updatePlan(
          { id: planId, payload },
          {
            onSuccess: () => {
              console.log("6. Patient plan updated successfully");
              toast.success(newCompletedSessions >= (plan?.total_sessions || 0) 
                ? "تم إكمال جميع الجلسات وتحديث حالة الخطة إلى مكتملة" 
                : "تم تحديث الجلسة بنجاح");
              
              // Invalidate the patient plan query to refresh the UI
              queryClient.invalidateQueries({ queryKey: ['patientPlan', planId] });
              queryClient.invalidateQueries({ queryKey: ['patientPlans'] });
              queryClient.invalidateQueries({ queryKey: ['appointments'] });
              queryClient.invalidateQueries({ queryKey: ['visits'] });
            },
            onError: (error) => {
              toast.error("حدث خطأ أثناء تحديث الجلسة");
              console.error("Error updating session:", error);
              // Revert the local state if the update failed
              setCompletedSessions(completedSessions);
            },
          }
        );
      } catch (error) {
        console.log("ERROR in PatientPlanDetailPage:", error.message);
        toast.error("حدث خطأ أثناء تسجيل الجلسة");
      }
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