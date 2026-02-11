import { CheckCircle2, Zap, Users, Calendar } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import usePricingPlans from "../../features/settings/usePricingPlans";
import { useAuth } from "../../features/auth/AuthContext";
import { formatCurrency } from "../../lib/utils";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";
// Import the hooks we need for usage statistics
import useSubscriptionUsage from "../../features/subscriptions/useSubscriptionUsage";
import usePatientCount from "../../features/subscriptions/usePatientCount";
import usePlanLimits from "../../features/subscriptions/usePlanLimits";
import usePlan from "../../features/auth/usePlan";

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {data: plans = [], isLoading, error} = usePricingPlans();
  const [showAnnual, setShowAnnual] = useState(false);
  
  // Get usage statistics for the current user
  const clinicId = user?.clinic_id;
  const { data: planData } = usePlan();
  const { data: usageStats } = useSubscriptionUsage(clinicId);
  const { data: patientCount } = usePatientCount(clinicId);
  const { data: planLimits } = usePlanLimits(clinicId);
  
  // Calculate usage percentages
  const currentPlan = planData?.plans;
  const isFreePlan = !currentPlan || currentPlan.name === "Free" || currentPlan.name === "باقة مجانية";
  
  // Get plan limits
  let patientLimit = planLimits?.maxPatients || 0;
  let appointmentLimit = planLimits?.maxAppointments || 0;
  
  // Calculate usage percentages with safety checks
  const patientUsagePercentage = patientLimit && patientLimit !== Infinity && usageStats?.monthlyPatients
    ? Math.min(100, Math.max(0, Math.round((usageStats.monthlyPatients / patientLimit) * 100)))
    : 0;
    
  const appointmentUsagePercentage = appointmentLimit && appointmentLimit !== Infinity && usageStats?.monthlyAppointments
    ? Math.min(100, Math.max(0, Math.round((usageStats.monthlyAppointments / appointmentLimit) * 100)))
    : 0;

  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { 
      opacity: 0, 
      y: 30,
      scale: 0.9
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

  if (isLoading) {
    return (
      <section id="pricing" className="container py-20 mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={container}
        >
          <motion.div variants={item} className="text-center space-y-4">
            <h2 className="text-3xl font-bold">خطط تسعير مرنة</h2>
            <p className="text-muted-foreground">
              اختر الخطة المناسبة لعيادتك وابدأ خلال دقائق.
            </p>
          </motion.div>
          <motion.div variants={item} className="mt-10 grid md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, index) => (
              <Card key={index} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-4 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <div className="h-10 bg-gray-200 rounded w-full"></div>
                </CardFooter>
              </Card>
            ))}
          </motion.div>
        </motion.div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="pricing" className="container py-20 mx-auto">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold">خطط تسعير مرنة</h2>
          <p className="text-destructive">
            حدث خطأ أثناء تحميل خطط التسعير. يرجى المحاولة مرة أخرى لاحقًا.
          </p>
        </div>
      </section>
    );
  }

  const handleSelectPlan = (plan) => {
    // Navigate to plan details page
    navigate(`/plan/${plan.id}`);
  };

  // Progress bar component for usage statistics
  const UsageProgressBar = ({ percentage, used, limit, label, icon: Icon }) => {
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-primary" />
            <span className="text-gray-600">{label}</span>
          </div>
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

  return (
    <section id="pricing" className="container py-20 mx-auto">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={container}
      >
        <motion.div variants={item} className="text-center space-y-4">
          <h2 className="text-3xl font-bold">خطط تسعير مرنة</h2>
          <p className="text-muted-foreground">
            اختر الخطة المناسبة لعيادتك وابدأ خلال دقائق.
          </p>
        </motion.div>

        {/* Payment Gateway Integration Notice */}
        <motion.div 
          variants={item}
          className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center"
        >
          <p className="text-blue-800">
            <strong>ملاحظة:</strong> جارٍ التكامل مع بوابات الدفع. إذا كنت ترغب في الاشتراك الآن، 
            يرجى <a href="https://wa.me/201158954215" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">التواصل مع فريق المبيعات</a> 
            وسوف يقوم فريقنا بتفعيل الاشتراك لك.
          </p>
        </motion.div>

        {/* Billing Period Toggle */}
        <motion.div variants={item} className="mt-8 flex justify-center">
          <div className="inline-flex items-center gap-3 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setShowAnnual(false)}
              className={`px-6 py-2 rounded-md font-medium transition-all duration-200 ${
                !showAnnual
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              شهري
            </button>
            <button
              onClick={() => setShowAnnual(true)}
              className={`relative px-6 py-2 rounded-md font-medium transition-all duration-200 ${
                showAnnual
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="flex items-center gap-2">
                سنوي
                <Zap className="size-4 text-green-500" />
              </span>
              <motion.span 
                className="absolute -top-2 -left-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full whitespace-nowrap"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
              >
                وفر شهرين
              </motion.span>
            </button>
          </div>
        </motion.div>

        {/* Current Usage Stats - Only show if user has a plan */}
        {currentPlan && (
          <motion.div variants={item} className="mt-8 max-w-2xl mx-auto">
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="p-6">
                <h3 className="font-medium text-gray-900 mb-4 text-center">إحصائيات استخدام باقتك الحالية</h3>
                
                {/* Patient Usage */}
                <div className="mb-4">
                  <UsageProgressBar 
                    percentage={patientUsagePercentage}
                    used={usageStats?.monthlyPatients || 0}
                    limit={patientLimit}
                    label="المرضى الجدد شهرياً"
                    icon={Users}
                  />
                </div>
                
                {/* Appointment Usage */}
                <div className="mb-4">
                  <UsageProgressBar 
                    percentage={appointmentUsagePercentage}
                    used={usageStats?.monthlyAppointments || 0}
                    limit={appointmentLimit}
                    label="الحجوزات الشهرية"
                    icon={Calendar}
                  />
                </div>
                
                <div className="text-center text-sm text-muted-foreground mt-4">
                  باقتك الحالية: <span className="font-medium">{currentPlan.name}</span>
                  {isFreePlan && (
                    <span className="block mt-1">للحصول على قيود أقل، قم بالترقية إلى باقة مدفوعة</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div 
          variants={container}
          className="mt-10 grid md:grid-cols-3 gap-6"
        >
          {(() => {
            // Reorder plans to put the popular one in the center
            let reorderedPlans = [...plans];
            const popularIndex = plans.findIndex(plan => plan.popular);
            
            if (popularIndex !== -1 && plans.length === 3) {
              // Move popular plan to center (index 1)
              const popularPlan = plans[popularIndex];
              const remainingPlans = plans.filter((_, index) => index !== popularIndex);
              reorderedPlans = [remainingPlans[0], popularPlan, remainingPlans[1]];
            }
            
            return reorderedPlans.map((plan, index) => {
              const annualPrice = plan.price * 10; // 10 months pricing
              const annualSavings = plan.price * 2; // 2 months free
              const displayPrice = showAnnual ? annualPrice : plan.price;
              
              return (
                <motion.div
                  key={index}
                  variants={item}
                  whileHover={{ 
                    y: -10,
                    scale: 1.02,
                    transition: { duration: 0.3 }
                  }}
                >
                  <Card
                    className={`${plan.popular ? "border-primary/40 relative" : ""} h-full`}
                  >
                    {plan.popular && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 15 }}
                      >
                        <Badge className="absolute top-4 end-4 bg-primary/10 text-primary">
                          الأكثر شعبية
                        </Badge>
                      </motion.div>
                    )}
                    <CardHeader>
                      <h3 className="text-xl font-semibold">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {plan.description}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="text-3xl font-bold">
                          {plan.price === 0 ? "مجاني" : formatCurrency(displayPrice)}
                          {plan.price > 0 && (
                            <span className="text-sm text-muted-foreground">
                              /{showAnnual ? 'سنة' : 'شهر'}
                            </span>
                          )}
                        </div>
                        {showAnnual && plan.price > 0 && (
                          <motion.div 
                            className="mt-2 flex items-center gap-2"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                          >
                            <Badge variant="outline" className="bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary border-primary/30 dark:border-primary/40">
                              <Zap className="size-3 ml-1 fill-primary/20" />
                              وفر {formatCurrency(annualSavings)}
                            </Badge>
                          </motion.div>
                        )}
                      </div>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        {plan.features.map((feature, featureIndex) => (
                          <motion.li 
                            key={featureIndex} 
                            className="flex items-start gap-2"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 * featureIndex }}
                          >
                            <CheckCircle2 className="size-4 text-primary mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <motion.button
                        onClick={() => handleSelectPlan(plan)}
                        className={`w-full inline-flex items-center justify-center cursor-pointer whitespace-nowrap rounded-[var(--radius)] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-50 ${
                          plan.popular 
                            ? "bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-4 py-2" 
                            : "border border-border bg-transparent text-foreground hover:bg-muted h-10 px-4 py-2"
                        }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        اختر الباقة
                      </motion.button>
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            });
          })()}
        </motion.div>
      </motion.div>
    </section>
  );
}
