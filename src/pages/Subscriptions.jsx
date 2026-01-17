import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { 
  Calendar, 
  Users, 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  CreditCard,
  RotateCcw,
  CalendarDays,
  Clock,
  DollarSign,
  Globe,
  Building,
  ShieldAlert
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { SkeletonLine } from "../components/ui/skeleton";
import usePlan from "../features/auth/usePlan";
import { useUser } from "../features/auth";
import useAllPlans from "../features/subscriptions/useAllPlans";
import usePatientCount from "../features/subscriptions/usePatientCount";
import useSubscriptionUsage from "../features/subscriptions/useSubscriptionUsage";
import usePlanLimits from "../features/subscriptions/usePlanLimits";
import { formatCurrency } from "../lib/utils";

export default function Subscriptions() {
  const navigate = useNavigate();
  const { user, isLoading: isUserLoading } = useUser();
  
  console.log("=== DEBUG: Subscriptions component render ===");
  console.log("User data:", user);
  console.log("User loading:", isUserLoading);
  
  const clinicId = user?.clinic_id;
  console.log("Clinic ID from user:", clinicId);
  
  const { data: planData, isLoading: isPlanLoading } = usePlan();
  const { data: allPlans, isLoading: isPlansLoading } = useAllPlans();
  const { data: patientCount, isLoading: isPatientCountLoading } = usePatientCount(clinicId);
  const { data: usageStats, isLoading: isUsageLoading } = useSubscriptionUsage(clinicId);
  const { data: planLimits, isLoading: isPlanLimitsLoading } = usePlanLimits(clinicId);

  console.log("Hook data:", {
    planData,
    allPlans,
    patientCount,
    usageStats,
    planLimits,
    clinicId
  });

  const isLoading = isUserLoading || isPlanLoading || isPlansLoading || isPatientCountLoading || isUsageLoading || isPlanLimitsLoading;
  
  useEffect(() => {
    console.log("=== DEBUG: Component effect triggered ===");
    console.log("Loading state:", isLoading);
    console.log("All data loaded:", !isLoading);
    
    if (!isLoading && !isUserLoading) {
      console.log("Final data state:");
      console.log("- User:", user);
      console.log("- Plan data:", planData);
      console.log("- All plans:", allPlans);
      console.log("- Patient count:", patientCount);
      console.log("- Usage stats:", usageStats);
      console.log("- Plan limits:", planLimits);
    }
  }, [isLoading, isUserLoading, user, planData, allPlans, patientCount, usageStats, planLimits]);

  const currentPlan = planData?.plans;
  const currentPlanId = planData?.plan_id;
  const isFreePlan = !currentPlan || currentPlan.name === "Free" || currentPlan.name === "باقة مجانية";
  const hasNoSubscription = !planData;  
  console.log("Current plan:", currentPlan);
  console.log("Is free plan:", isFreePlan);
  
  const subscriptionStartDate = planData?.current_period_start;
  const subscriptionEndDate = planData?.current_period_end;
  const billingPeriod = planData?.billing_period || "monthly";
  
  console.log("Subscription start date:", subscriptionStartDate);
  console.log("Subscription end date:", subscriptionEndDate);
  console.log("Billing period:", billingPeriod);
  
  let daysRemaining = null;
  if (subscriptionEndDate) {
    const today = new Date();
    const end = new Date(subscriptionEndDate);
    const diffTime = end - today;
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    console.log("Days remaining:", daysRemaining);
  }

  const isExpired = !hasNoSubscription && !isFreePlan && daysRemaining !== null && daysRemaining < 0;

  // Get plan limits from the new hook or fallback to embedded data
  let patientLimit = 50;
  let appointmentLimit = 200;
  
  if (planLimits) {
    patientLimit = planLimits.maxPatients || 50;
    appointmentLimit = planLimits.maxAppointments || 200;
  } else if (currentPlan?.limits) {
    // Fallback to embedded limits in currentPlan
    try {
      const limits = typeof currentPlan.limits === 'string' 
        ? JSON.parse(currentPlan.limits) 
        : currentPlan.limits;
      
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
  
  console.log("Patient limit:", patientLimit);
  console.log("Appointment limit:", appointmentLimit);

  // Calculate usage percentages with safety checks
  const patientUsagePercentage = patientLimit && patientLimit !== Infinity && (patientCount !== undefined && patientCount !== null)
    ? Math.min(100, Math.max(0, Math.round((patientCount / patientLimit) * 100)))
    : 0;
    
  const appointmentUsagePercentage = appointmentLimit && appointmentLimit !== Infinity && usageStats?.monthlyAppointments
    ? Math.min(100, Math.max(0, Math.round((usageStats.monthlyAppointments / appointmentLimit) * 100)))
    : 0;

  console.log("Patient usage percentage:", patientUsagePercentage);
  console.log("Appointment usage percentage:", appointmentUsagePercentage);

  // Get available upgrade plans (higher than current)
  const upgradePlans = allPlans?.filter(plan => {
    if (!currentPlan) return true;
    return Number(plan.price) > Number(currentPlan.price || 0);
  }) || [];
  
  console.log("Upgrade plans:", upgradePlans);
  
  // Check if user is on the highest plan
  const isHighestPlan = allPlans && currentPlan && 
    currentPlan.price === Math.max(...allPlans.map(p => p.price));

  const handleSwitchPlan = (planId) => {
    console.log("Switching to plan:", planId);
    navigate(`/plan/${planId}`);
  };

  const handleRenewCurrentPlan = () => {
    if (!currentPlanId) return;
    navigate(`/plan/${currentPlanId}`);
  };

  // Handle billing period toggle
  const handleToggleBillingPeriod = () => {
    console.log("Toggling billing period");
    // In a real implementation, this would trigger a plan change
    // For now, we'll just show a message
    alert("تغيير فترة الفوترة سيتم تنفيذه في التجديد القادم");
  };

  // Progress bar component for usage statistics
  const UsageProgressBar = ({ percentage, used, limit, label }) => {
    console.log("Rendering progress bar:", { percentage, used, limit, label });
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">{label}</span>
          <span className="font-medium">
            {used || 0} {limit !== Infinity ? `/ ${limit}` : "(غير محدود)"}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${
              percentage < 70 ? "bg-green-500" : 
              percentage < 90 ? "bg-yellow-500" : "bg-red-500"
            }`}
            style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
          ></div>
        </div>
        <div className="text-xs text-gray-500 text-left">
          {isNaN(percentage) ? "0" : percentage}% مستخدم
        </div>
      </div>
    );
  };

  // Show loading state if user data is still loading
  if (isUserLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30" dir="rtl" lang="ar">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">إدارة الاشتراك</h1>
            <p className="text-gray-600">عرض تفاصيل باقة الاشتراك الحالية واستكشاف الخطط الأخرى</p>
          </div>
          <div className="space-y-6">
            <Card className="rounded-[var(--radius)] border-0 shadow-lg">
              <CardHeader className="pb-4 border-b border-gray-200">
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded-[var(--radius)] w-1/3 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded-[var(--radius)] w-1/2"></div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded-[var(--radius)] w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded-[var(--radius)] w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded-[var(--radius)] w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    );
  }

  // Show data even if user is undefined but we have other data
  // This allows the page to work with partial data
  if (!user && !isLoading) {
    console.log("User data not available, but showing other available data");
  }

  return (
    <main className="min-h-screen bg-background p-2 md:p-4" dir="rtl" lang="ar">
      <div className="w-full max-w-[98%] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-[var(--radius)] bg-primary/10 text-primary">
              <CreditCard className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">إدارة الاشتراك</h1>
          </div>
          <p className="text-sm text-muted-foreground mr-11">شوف تفاصيل باقتك واستكشف الخطط التانية</p>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <Card className="rounded-[var(--radius)] bg-card/70">
              <CardHeader className="pb-4 border-b border-border">
                <div className="animate-pulse">
                  <div className="h-6 bg-muted rounded w-1/3 mb-2"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, index) => (
                <Card key={index} className="rounded-[var(--radius)] bg-card/70 animate-pulse">
                  <CardHeader className="pb-4 border-b border-border">
                    <div className="h-6 bg-muted rounded w-1/2 mb-2"></div>
                    <div className="h-4 bg-muted rounded w-1/3"></div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-3">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-4 bg-muted rounded"></div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Current Plan Section */}
            <section className="mb-8">
              <Card className="rounded-[var(--radius)] bg-card/70">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-[var(--radius)]">
                        <Zap className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold text-foreground">
                          {hasNoSubscription ? "مفيش اشتراك" : "باقتك"}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {hasNoSubscription 
                            ? "اشترك عشان تستخدم كل المميزات" 
                            : (isFreePlan ? "مجاني" : currentPlan?.name)}
                        </p>
                      </div>
                    </div>
                    
                    {!hasNoSubscription && !isFreePlan && (
                      <Badge
                        variant={isExpired ? "destructive" : "default"}
                        className="px-3 py-1 text-xs flex items-center gap-1"
                      >
                        {isExpired ? "منتهي" : "نشط"}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="p-6">
                  {hasNoSubscription ? (
                    <div className="text-center py-8">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 mb-3">
                        <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-400" />
                      </div>
                      <h3 className="text-base font-medium text-foreground mb-2">مفيش اشتراك فعال</h3>
                      <p className="text-sm text-muted-foreground mb-6">
                        اشترك في باقة عشان تستخدم كل مميزات النظام
                      </p>
                      <Button 
                        onClick={() => {
                          document.getElementById('available-plans')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="rounded-[var(--radius)]"
                      >
                        اختار باقتك
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Plan Info Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Plan Type */}
                        <div className="p-3 rounded-[var(--radius)] border border-border/50 bg-muted/20">
                          <div className="flex items-center gap-2 mb-1">
                            <Zap className="w-4 h-4 text-primary" />
                            <p className="text-xs text-muted-foreground">نوع الباقة</p>
                          </div>
                          <p className="text-sm font-medium">
                            {isFreePlan ? "مجاني" : currentPlan?.name}
                          </p>
                        </div>
                        
                        {/* Billing Period */}
                        <div className="p-3 rounded-[var(--radius)] border border-border/50 bg-muted/20">
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar className="w-4 h-4 text-primary" />
                            <p className="text-xs text-muted-foreground">فترة الفوترة</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">
                              {billingPeriod === "annual" ? "سنوي" : "شهري"}
                            </p>
                            {!isFreePlan && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={handleToggleBillingPeriod}
                                className="h-6 px-2 text-xs"
                              >
                                تغيير
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {!isFreePlan && subscriptionEndDate && (
                          <div className="p-3 rounded-[var(--radius)] border border-border/50 bg-muted/20">
                          <div className="flex items-center gap-2 mb-1">
                              <CalendarDays className="w-4 h-4 text-primary" />
                              <p className="text-xs text-muted-foreground">الانتهاء</p>
                            </div>
                            <p className="text-sm font-medium">
                              {format(new Date(subscriptionEndDate), "dd MMM yyyy", { locale: ar })}
                            </p>
                            {daysRemaining !== null && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {daysRemaining > 0
                                  ? `${daysRemaining} ${daysRemaining === 1 ? "يوم" : "أيام"} متبقية`
                                  : daysRemaining === 0
                                  ? "ينتهي اليوم"
                                  : `انتهت منذ ${Math.abs(daysRemaining)} يوم${Math.abs(daysRemaining) === 1 ? "" : "ا"}`}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {isExpired && (
                        <div className="p-3 rounded-[var(--radius)] border border-red-200 bg-red-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="text-sm text-red-700">
                            انتهت صلاحية اشتراكك. قم بتجديد الباقة للاستمرار في استخدام النظام بدون انقطاع.
                          </div>
                          <Button
                            onClick={handleRenewCurrentPlan}
                            className="w-full sm:w-auto rounded-[var(--radius)] bg-red-600 hover:bg-red-700"
                          >
                            <RotateCcw className="w-4 h-4 ml-2" />
                            تجديد الباقة
                          </Button>
                        </div>
                      )}

                      {/* Usage Stats */}
                      <div className="space-y-4">
                        <div className="p-4 rounded-[var(--radius)] border border-border/50 bg-muted/20">
                          <h3 className="text-sm font-medium text-foreground mb-4">إحصائيات الاستخدام</h3>
                          
                          {/* Patient Usage */}
                          <div className="mb-4">
                            <UsageProgressBar 
                              percentage={patientUsagePercentage}
                              used={patientCount || 0}
                              limit={patientLimit}
                              label="المرضى"
                            />
                          </div>
                          
                          {/* Appointment Usage */}
                          <div>
                            <UsageProgressBar 
                              percentage={appointmentUsagePercentage}
                              used={usageStats?.monthlyAppointments || 0}
                              limit={appointmentLimit}
                              label="الحجوزات الشهرية"
                            />
                          </div>
                        </div>
                        
                        {/* Appointment Source & Income */}
                        {(usageStats?.monthlyAppointments > 0 || usageStats?.totalIncome > 0) && (
                          <div className="p-4 rounded-[var(--radius)] border border-border/50 bg-muted/20">
                            {/* Appointment Sources */}
                            {usageStats?.monthlyAppointments > 0 && (
                              <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-[var(--radius)]">
                                  <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">من الموقع</p>
                                    <p className="text-sm font-medium">
                                      {usageStats?.onlineAppointments || 0}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-[var(--radius)]">
                                  <Building className="w-4 h-4 text-green-600 dark:text-green-400" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">من العيادة</p>
                                    <p className="text-sm font-medium">
                                      {usageStats?.clinicAppointments || 0}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Income */}
                            {usageStats?.totalIncome > 0 && (
                              <div className="flex items-center justify-between pt-3 border-t border-border">
                                <div className="flex items-center gap-2">
                                  <DollarSign className="w-4 h-4 text-primary" />
                                  <span className="text-sm text-muted-foreground">إجمالي الدخل (الشهر ده)</span>
                                </div>
                                <span className="text-sm font-bold text-foreground">
                                  {formatCurrency(usageStats?.totalIncome)}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
            
            {/* Available Plans */}
            {upgradePlans.length > 0 && (
              <div id="available-plans" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-foreground">خطط الاشتراك المتاحة</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upgradePlans.map((plan) => (
                    <Card 
                      key={plan.id} 
                      className="rounded-[var(--radius)] overflow-hidden transition-all duration-300 hover:shadow-lg bg-card/70"
                    >
                      <CardHeader className="pb-4">
                        <div className="flex justify-between items-start">
                          <div className="bg-primary/10 p-2 rounded-[var(--radius)] mb-3">
                            <Zap className="w-5 h-5 text-primary" />
                          </div>
                        </div>
                        <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                        <div className="flex items-baseline gap-1 mt-2">
                          <span className="text-2xl font-bold">{formatCurrency(plan.price)}</span>
                          <span className="text-sm text-muted-foreground">/ {plan.billing_period === 'annual' ? 'سنة' : 'شهر'}</span>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6 pt-0">
                        <p className="text-sm text-muted-foreground mb-6 line-clamp-2">
                          {plan.description}
                        </p>
                        
                        <div className="space-y-3 mb-6">
                          {(typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features)?.slice(0, 4).map((feature, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                              <span className="text-sm text-muted-foreground">{feature}</span>
                            </div>
                          ))}
                        </div>
                        
                        <Button 
                          className="w-full rounded-[var(--radius)]"
                          onClick={() => handleSwitchPlan(plan.id)}
                        >
                          اشترك الآن
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
