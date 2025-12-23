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

  // Get current plan details
  const currentPlan = planData?.plans;
  const isFreePlan = !currentPlan || currentPlan.name === "Free" || currentPlan.name === "باقة مجانية";
  const hasNoSubscription = !planData;  
  console.log("Current plan:", currentPlan);
  console.log("Is free plan:", isFreePlan);
  
  // Get subscription details
  const subscriptionStartDate = planData?.current_period_start;
  const subscriptionEndDate = planData?.current_period_end;
  const billingPeriod = planData?.billing_period || "monthly";
  
  console.log("Subscription start date:", subscriptionStartDate);
  console.log("Subscription end date:", subscriptionEndDate);
  console.log("Billing period:", billingPeriod);
  
  // Calculate days remaining
  let daysRemaining = null;
  if (subscriptionEndDate) {
    const today = new Date();
    const end = new Date(subscriptionEndDate);
    const diffTime = end - today;
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    console.log("Days remaining:", daysRemaining);
  }

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
    return plan.price > (currentPlan.price || 0);
  }) || [];
  
  console.log("Upgrade plans:", upgradePlans);
  
  // Check if user is on the highest plan
  const isHighestPlan = allPlans && currentPlan && 
    currentPlan.price === Math.max(...allPlans.map(p => p.price));

  // Handle plan switching
  const handleSwitchPlan = (planId) => {
    console.log("Switching to plan:", planId);
    navigate(`/plan/${planId}`);
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
            <Card className="rounded-2xl border-0 shadow-lg">
              <CardHeader className="pb-4 border-b border-gray-200">
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
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
    <main className="min-h-screen bg-background p-4 md:p-6" dir="rtl" lang="ar">
      <div className="container mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <CreditCard className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">إدارة الاشتراك</h1>
          </div>
          <p className="text-muted-foreground">شوف تفاصيل باقتك واستكشف الخطط التانية</p>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <Card className="rounded-2xl bg-card/70">
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
                <Card key={index} className="rounded-2xl bg-card/70 animate-pulse">
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
            <section className="mb-12">
              <Card className="rounded-2xl bg-card/70">
                <CardHeader className="pb-4 border-b border-border">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl font-bold text-foreground flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-lg">
                          <CreditCard className="w-5 h-5 text-primary" />
                        </div>
                        {hasNoSubscription ? "مفيش اشتراك فعال" : "باقتك دلوقتي"}
                      </CardTitle>
                      <p className="text-muted-foreground mt-1">
                        {hasNoSubscription 
                          ? "لازم تشترك عشان تستخدم كل المميزات" 
                          : (isFreePlan ? "باقة مجانية" : currentPlan?.name || "غير محدد")}
                      </p>
                    </div>
                    
                    {!hasNoSubscription && !isFreePlan && (
                      <Badge variant="default" className="text-sm">
                        نشط
                      </Badge>
                    )}
                  </div>
                </CardHeader>                
                <CardContent className="p-6">
                  {hasNoSubscription ? (
                    <div className="text-center py-8">
                      <div className="bg-red-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <ShieldAlert className="w-8 h-8 text-red-600" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">لا يوجد اشتراك فعال</h3>
                      <p className="text-gray-600 mb-6">
                        يجب أن تكون مشتركًا في إحدى الباقات للوصول إلى جميع ميزات النظام
                      </p>
                      <Button 
                        onClick={() => {
                          // Scroll to available plans section
                          document.getElementById('available-plans')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        اختر باقتك الآن
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Plan Details */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                          <div className="flex items-center gap-3">
                            <div className="bg-primary/10 p-2 rounded-lg">
                              <Zap className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">نوع الباقة</p>
                              <p className="text-gray-600 text-sm">
                                {isFreePlan ? "مجاني" : currentPlan?.name || "غير محدد"}
                              </p>
                            </div>
                          </div>
                          
                          {currentPlan?.popular && (
                            <Badge className="bg-yellow-500 hover:bg-yellow-600">
                              الأكثر شعبية
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                          <div className="flex items-center gap-3">
                            <div className="bg-primary/10 p-2 rounded-lg">
                              <Calendar className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">فترة الفوترة</p>
                              <p className="text-gray-600 text-sm">
                                {billingPeriod === "annual" ? "سنوي" : "شهري"}
                              </p>
                            </div>
                          </div>
                          
                          {!isFreePlan && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={handleToggleBillingPeriod}
                              className="text-xs"
                            >
                              <RotateCcw className="w-3 h-3 ml-1" />
                              تغيير
                            </Button>
                          )}
                        </div>
                        
                        {/* Subscription End Date - Moved here for large screens */}
                        {!isFreePlan && subscriptionEndDate && (
                          <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                            <div className="flex items-center gap-3">
                              <div className="bg-primary/10 p-2 rounded-lg">
                                <CalendarDays className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">انتهاء الاشتراك</p>
                                <p className="text-gray-600 text-sm">
                                  {format(new Date(subscriptionEndDate), "dd MMMM yyyy", { locale: ar })}
                                </p>
                              </div>
                            </div>
                            
                            {daysRemaining !== null && (
                              <Badge 
                                variant={daysRemaining <= 7 ? "destructive" : "secondary"}
                                className="text-xs"
                              >
                                {daysRemaining} {daysRemaining === 1 ? "يوم" : "أيام"} متبقية
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Usage Stats */}
                      <div className="lg:col-span-2 space-y-4">
                        <div className="p-4 bg-white rounded-xl border border-gray-200">
                          <h3 className="font-medium text-gray-900 mb-3">إحصائيات الاستخدام</h3>
                          
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
                          <div className="mb-4">
                            <UsageProgressBar 
                              percentage={appointmentUsagePercentage}
                              used={usageStats?.monthlyAppointments || 0}
                              limit={appointmentLimit}
                              label="الحجوزات الشهرية"
                            />
                          </div>
                          
                          {/* Appointment Source Stats */}
                          {(usageStats?.monthlyAppointments > 0 || usageStats?.onlineAppointments > 0 || usageStats?.clinicAppointments > 0) && (
                            <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-gray-100">
                              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                                <Globe className="w-4 h-4 text-blue-500" />
                                <div>
                                  <p className="text-xs text-gray-600">من الموقع</p>
                                  <p className="font-medium text-sm">
                                    {usageStats?.onlineAppointments || 0}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                                <Building className="w-4 h-4 text-green-500" />
                                <div>
                                  <p className="text-xs text-gray-600">من العيادة</p>
                                  <p className="font-medium text-sm">
                                    {usageStats?.clinicAppointments || 0}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Income */}
                          <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-4">
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-green-500" />
                              <span className="text-sm text-gray-600">الإيرادات الكلية</span>
                            </div>
                            <span className="font-medium">
                              {formatCurrency(usageStats?.totalIncome || 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Features List */}
                  {currentPlan?.features && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-3">المميزات المتاحة:</h3>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {currentPlan.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Upgrade Button - Only show if not on highest plan */}
                  {!isFreePlan && upgradePlans.length > 0 && !isHighestPlan && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <Button 
                        onClick={() => handleSwitchPlan(upgradePlans[0].id)}
                        className="w-full sm:w-auto"
                      >
                        ترقية إلى باقة أعلى
                        <ArrowRight className="w-4 h-4 mr-2" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
            
            {/* Available Plans Section - Only show if not on highest plan */}
            {!isHighestPlan && (
              <section id="available-plans">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">الباقات المتاحة</h2>
                  <p className="text-gray-600">اختر الباقة التي تناسب احتياجاتك</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allPlans?.map((plan) => {
                    const isCurrentPlan = plan.id === currentPlan?.id;
                    const isHigherPlan = plan.price > (currentPlan?.price || 0);
                    
                    return (
                      <Card 
                        key={plan.id} 
                        className={`rounded-2xl border-0 shadow-lg overflow-hidden ${
                          plan.popular ? "ring-2 ring-yellow-500 ring-offset-2" : ""
                        }`}
                      >
                        {plan.popular && (
                          <div className="bg-yellow-500 text-white text-center py-2 text-sm font-medium">
                            الأكثر شعبية
                          </div>
                        )}
                        
                        <CardHeader className="pb-4 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-bold text-gray-900">
                              {plan.name}
                            </CardTitle>
                            {isCurrentPlan && (
                              <Badge variant="default">الحالي</Badge>
                            )}
                          </div>
                          <div className="mt-2">
                            <span className="text-3xl font-bold text-gray-900">
                              {formatCurrency(plan.price)}
                            </span>
                            <span className="text-gray-600 mr-2">/ شهر</span>
                          </div>
                          {plan.description && (
                            <p className="text-gray-600 text-sm mt-2">{plan.description}</p>
                          )}
                        </CardHeader>
                        
                        <CardContent className="p-6">
                          <ul className="space-y-3 mb-6">
                            {plan.features.map((feature, index) => (
                              <li key={index} className="flex items-start gap-2 text-sm">
                                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-700">{feature}</span>
                              </li>
                            ))}
                          </ul>
                          
                          <Button
                            onClick={() => handleSwitchPlan(plan.id)}
                            disabled={isCurrentPlan}
                            className="w-full"
                            variant={isCurrentPlan ? "outline" : isHigherPlan ? "default" : "secondary"}
                          >
                            {isCurrentPlan 
                              ? "الباقة الحالية" 
                              : isHigherPlan 
                                ? "ترقية" 
                                : "تبديل إلى هذه الباقة"}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}