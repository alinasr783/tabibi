import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Calendar, Crown, TrendingUp, Users, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { SkeletonLine } from "../../components/ui/skeleton";
import usePlan from "../auth/usePlan";
import { useUser } from "../auth";
import { useActiveSubscription } from "../auth/useSubscription";
// Import hooks for usage statistics
import useSubscriptionUsage from "../subscriptions/useSubscriptionUsage";
import usePatientCount from "../subscriptions/usePatientCount";
import usePlanLimits from "../subscriptions/usePlanLimits";

export default function SubscriptionBanner() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { data: planData, isLoading: isPlanLoading } = usePlan();
  const { data: subscription, isLoading: isSubLoading } = useActiveSubscription(
    user?.clinic_id
  );
  
  // Get usage statistics
  const clinicId = user?.clinic_id;
  const { data: usageStats, isLoading: isUsageLoading } = useSubscriptionUsage(clinicId);
  const { data: patientCount, isLoading: isPatientCountLoading } = usePatientCount(clinicId);
  const { data: planLimits, isLoading: isPlanLimitsLoading } = usePlanLimits(clinicId);

  const isLoading = isPlanLoading || isSubLoading || isUsageLoading || isPatientCountLoading || isPlanLimitsLoading;

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <SkeletonLine className="h-5 w-32" />
              <SkeletonLine className="h-4 w-48" />
            </div>
            <SkeletonLine className="h-9 w-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Extract plan information correctly
  const plan = planData?.plans;
  const planName = plan?.name || "باقة مجانية";
  const endDate = planData?.current_period_end;
  const isFree = !plan || planName === "Free" || planName === "باقة مجانية";

  // Get plan limits
  let patientLimit = 50;
  let appointmentLimit = 200;
  
  if (planLimits) {
    patientLimit = planLimits.maxPatients || 50;
    appointmentLimit = planLimits.maxAppointments || 200;
  } else if (plan?.limits) {
    try {
      const limits = typeof plan.limits === 'string' 
        ? JSON.parse(plan.limits) 
        : plan.limits;
      
      if (limits.max_patients !== undefined) {
        patientLimit = limits.max_patients;
      }
      
      if (limits.max_appointments !== undefined) {
        appointmentLimit = limits.max_appointments;
      }
    } catch (e) {
      console.warn("Failed to parse embedded plan limits:", e);
    }
  }

  // Calculate usage percentages with safety checks
  const patientUsagePercentage = patientLimit && patientLimit !== Infinity && (patientCount !== undefined && patientCount !== null)
    ? Math.min(100, Math.max(0, Math.round((patientCount / patientLimit) * 100)))
    : 0;
    
  const appointmentUsagePercentage = appointmentLimit && appointmentLimit !== Infinity && usageStats?.monthlyAppointments
    ? Math.min(100, Math.max(0, Math.round((usageStats.monthlyAppointments / appointmentLimit) * 100)))
    : 0;

  // Calculate days remaining
  let daysRemaining = null;
  let daysRemainingText = "";
  if (endDate) {
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end - today;
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Generate dynamic text based on days remaining
    if (daysRemaining <= 0) {
      daysRemainingText = "انتهت صلاحية الباقة";
    } else if (daysRemaining === 1) {
      daysRemainingText = "متبقية يوم واحد";
    } else if (daysRemaining === 2) {
      daysRemainingText = "متبقية يومين";
    } else if (daysRemaining <= 10) {
      daysRemainingText = `متبقية ${daysRemaining} أيام - تجديد مطلوب`;
    } else {
      daysRemainingText = `متبقية ${daysRemaining} يوم`;
    }
  }

  // Progress bar component for usage statistics
  const UsageProgressBar = ({ percentage, used, limit, label, icon: Icon }) => {
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <div className="flex items-center gap-1">
            <Icon className="w-3 h-3 text-primary" />
            <span className="text-gray-600">{label}</span>
          </div>
          <span className="font-medium">
            {used || 0} {limit !== Infinity ? `/ ${limit}` : "(غير محدود)"}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div 
            className={`h-1.5 rounded-full ${
              percentage < 70 ? "bg-green-500" : 
              percentage < 90 ? "bg-yellow-500" : "bg-red-500"
            }`}
            style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="py-4">
        <div className="space-y-3">
          {/* Plan Info */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="size-10 rounded-full bg-primary/20 text-primary grid place-items-center">
                <Crown className="size-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-base">{planName}</h3>
                  {!isFree && (
                    <span className="text-xs text-muted-foreground">
                      نشط
                    </span>
                  )}
                </div>
                {endDate ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="size-3.5" />
                    {daysRemaining !== null && daysRemaining <= 30 ? (
                      <Badge
                        variant="default"
                        className="text-xs"
                      >
                        {daysRemaining <= 2 ? (
                          daysRemaining === 1 ? "يوم" : "يومين"
                        ) : (
                          `${daysRemaining} ${daysRemaining === 1 ? "يوم" : "أيام"} متبقية`
                        )}
                      </Badge>
                    ) : (
                      <span>
                        {daysRemainingText}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">باقة مجانية بدون تاريخ انتهاء</p>
                )}
              </div>
            </div>
            <Button
              onClick={() => navigate("/subscriptions")}
              variant={isFree ? "default" : "outline"}
              size="sm"
              className="gap-2"
            >
              <TrendingUp className="size-4" />
              {isFree ? "ترقية" : "إدارة الباقة"}
            </Button>
          </div>
          
          {/* Usage Stats - Only show if user has a plan */}
          {plan && (
            <div className="pt-3 border-t border-primary/10">
              <div className="grid grid-cols-2 gap-3">
                {/* Patient Usage */}
                <UsageProgressBar 
                  percentage={patientUsagePercentage}
                  used={patientCount || 0}
                  limit={patientLimit}
                  label="المرضى"
                  icon={Users}
                />
                
                {/* Appointment Usage */}
                <UsageProgressBar 
                  percentage={appointmentUsagePercentage}
                  used={usageStats?.monthlyAppointments || 0}
                  limit={appointmentLimit}
                  label="الحجوزات"
                  icon={Clock}
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}