import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  Shield,
  Calendar,
  Zap,
  Wallet,
  Smartphone,
  Phone,
  Star
} from 'lucide-react'
import { Button } from '../components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx'
import { Badge } from '../components/ui/badge.jsx'
import { useAuth } from '@/features/auth/AuthContext'
import { useCreateSubscription } from '@/features/auth/useSubscription'
import { getPlanById } from '@/services/apiSubscriptions'
import { getPlanIcon } from '@/lib/planUtils.jsx'
import { formatCurrency } from '@/lib/utils'
import { DiscountCodeInput, useDiscountCode } from '@/features/discount-code'
import usePricingPlan from '@/features/settings/usePricingPlan'

export default function PlanConfirmation() {
  const { planId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const { data: plan, isLoading: isPlanLoading, error } = usePricingPlan(planId)
  const { mutate: createSubscription, isPending: isCreating } = useCreateSubscription()
  
  const [billingPeriod, setBillingPeriod] = useState('monthly')
  const discount = useDiscountCode(plan?.price || 0)
  
  const isLoading = isPlanLoading
  const isSubmitting = isCreating

  // Calculate pricing with discount
  const pricing = {
    basePrice: plan?.price || 0,
    finalPrice: discount.finalAmount || plan?.price || 0,
    savings: 0,
    duration: 1,
    monthlyEquivalent: plan?.price || 0
  }

  // Apply annual discount if selected
  if (billingPeriod === 'annual' && plan) {
    const monthlyPrice = plan.price
    const annualPrice = monthlyPrice * 10
    const savings = monthlyPrice * 2
    
    pricing.basePrice = annualPrice
    pricing.finalPrice = discount.finalAmount ? (discount.finalAmount * 10) : annualPrice
    pricing.savings = savings
    pricing.duration = 12
    pricing.monthlyEquivalent = annualPrice / 12
  }

  const finalPrice = pricing.finalPrice

  // Handle subscription confirmation
  const handleConfirmSubscription = (paymentMethod = 'card') => {
    if (!user) {
      navigate("/login")
      return
    }

    if (!plan) {
      toast.error("❌ لم يتم تحميل تفاصيل الخطة")
      return
    }

    createSubscription({
      clinicId: user.clinic_id,
      planId: plan.id,
      billingPeriod,
      amount: finalPrice,
      paymentMethod
    })
  }

  const getButtonText = (planName) => {
    if (!planName) return "تأكيد الاشتراك"
    if (planName.includes("الأساسية")) return "تأكيد الاشتراك في الخطة الأساسية"
    if (planName.includes("القياسية")) return "تأكيد الاشتراك في الخطة القياسية"
    if (planName.includes("المميزة")) return "تأكيد الاشتراك في الخطة المميزة"
    return "تأكيد الاشتراك"
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30" dir="rtl" lang="ar">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded-lg w-48 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded-lg w-32"></div>
            </div>
            <div className="h-10 bg-gray-200 rounded-lg w-24"></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {[...Array(2)].map((_, index) => (
              <Card key={index} className="rounded-2xl border-0 shadow-lg animate-pulse">
                <CardHeader className="pb-4 border-b border-gray-200">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-4 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                </CardContent>
                <div className="p-6 pt-0">
                  <div className="h-12 bg-gray-200 rounded-xl w-full"></div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>
    )
  }

  if (error || !plan) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30" dir="rtl" lang="ar">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-2xl mx-auto">
              <div className="text-red-700 flex flex-col items-center gap-4">
                <AlertCircle className="w-12 h-12" />
                <h2 className="text-2xl font-bold">حدث خطأ أثناء تحميل الخطة</h2>
                <p className="text-gray-600">تعذر تحميل تفاصيل الخطة. يرجى المحاولة مرة أخرى.</p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="border-gray-300 hover:bg-gray-50"
                    onClick={() => navigate(-1)}
                  >
                    <ArrowLeft className="w-4 h-4 ml-2" />
                    العودة
                  </Button>
                  <Button
                    className="bg-primary hover:bg-primary/90"
                    onClick={() => window.location.reload()}
                  >
                    إعادة تحميل
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30" dir="rtl" lang="ar">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
              تأكيد الاشتراك في الخطة
            </h1>
            <p className="text-gray-600 text-lg">
              راجع تفاصيل الخطة وأكمل عملية الدفع
            </p>
          </div>
          <Button 
            variant="outline" 
            className="border-gray-300 hover:bg-gray-50 flex items-center gap-2"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4" />
            العودة
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Plan Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Plan Overview Card */}
            <Card className="rounded-2xl border-0 shadow-lg">
              <CardHeader className="pb-4 border-b border-gray-200">
                <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    {getPlanIcon(plan.name)}
                  </div>
                  {plan.name}
                  <span className="text-sm font-normal text-gray-600">
                    {plan.description}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {/* Features Section */}
                <div className="space-y-6">
                  <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
                    <h3 className="font-semibold text-gray-900 mb-4 text-lg flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                      مميزات الخطة
                    </h3>
                    <ul className="space-y-4">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-white border border-blue-200 rounded-full flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="w-3 h-3 text-blue-600" />
                          </div>
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Plan Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <h4 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        مدة الاشتراك
                      </h4>
                      <div className="text-2xl font-bold text-primary">
                        {billingPeriod === 'annual' ? '12 شهر' : '1 شهر'}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {billingPeriod === 'annual' ? 'بسعر 10 شهور فقط' : 'قابلة للتجديد'}
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <h4 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-gray-400" />
                        الحالة
                      </h4>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="font-medium text-gray-900">متوفرة الآن</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        فعالة فور الدفع
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Assurance */}
            <Card className="rounded-2xl border-0 shadow-lg bg-green-50 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 p-3 rounded-xl">
                    <Shield className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg mb-2">دفع آمن</h3>
                    <p className="text-sm text-gray-700">
                      جميع عمليات الدفع مشفرة وآمنة. بياناتك محمية بنظام تشفير متقدم.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Payment Summary */}
          <div className="space-y-6">
            {/* Payment Summary Card */}
            <Card className="rounded-2xl border-0 shadow-lg sticky top-6">
              <CardHeader className="pb-4 border-b border-gray-200">
                <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                  </div>
                  ملخص الدفع
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Billing Period Selector */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    فترة الفوترة
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setBillingPeriod('monthly')}
                      className={`py-3 px-4 rounded-xl font-medium transition-all duration-200 border ${
                        billingPeriod === 'monthly'
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">شهري</span>
                      </div>
                    </button>
                    <button
                      onClick={() => setBillingPeriod('annual')}
                      className={`relative py-3 px-4 rounded-xl font-medium transition-all duration-200 border ${
                        billingPeriod === 'annual'
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Zap className="w-4 h-4" />
                        <span className="text-sm">سنوي</span>
                      </div>
                      {billingPeriod === 'annual' && (
                        <Badge className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                          <Zap className="w-3 h-3 ml-1" />
                          وفر {formatCurrency(pricing.savings)}
                        </Badge>
                      )}
                    </button>
                  </div>
                </div>

                {/* Annual Savings Banner */}
                {billingPeriod === 'annual' && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        <Zap className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-green-900 mb-1">
                          عرض خاص: وفر شهرين مجاناً!
                        </h4>
                        <p className="text-sm text-green-700">
                          ادفع مقابل 10 شهور واحصل على 12 شهر كاملة
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Discount Code */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Star className="w-4 h-4 text-gray-400" />
                    كود الخصم
                  </label>
                  <DiscountCodeInput
                    onApply={discount.applyDiscount}
                    isPending={discount.isPending}
                    error={discount.error}
                    isApplied={!!discount.appliedDiscount}
                    onClear={discount.clearDiscount}
                    discountAmount={discount.discountAmount}
                    discountValue={
                      discount.appliedDiscount?.is_percentage
                        ? discount.appliedDiscount?.value
                        : discount.discountAmount
                    }
                    isPercentage={
                      discount.appliedDiscount?.is_percentage || false
                    }
                  />
                </div>

                {/* Pricing Details */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">سعر الخطة</span>
                    <span className="font-semibold">{formatCurrency(pricing.basePrice)}</span>
                  </div>
                  
                  {billingPeriod === 'annual' && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600">خصم سنوي</span>
                      <span className="font-semibold text-green-600">-{formatCurrency(pricing.savings)}</span>
                    </div>
                  )}
                  
                  {discount.discountAmount > 0 && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600">كود الخصم</span>
                      <span className="font-semibold text-green-600">
                        -{formatCurrency(discount.discountAmount * (billingPeriod === 'annual' ? 10 : 1))}
                      </span>
                    </div>
                  )}

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900">المجموع الكلي</span>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {formatCurrency(finalPrice)}
                        </div>
                        {billingPeriod === 'annual' && (
                          <p className="text-xs text-gray-500">
                            {formatCurrency(pricing.monthlyEquivalent)} / شهر
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Method Selection - Hidden as requested */}

                {/* Important Notes */}
                <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                  <h4 className="font-semibold text-yellow-800 text-sm mb-2">ملاحظات هامة</h4>
                  <ul className="text-xs text-yellow-700 space-y-1">
                    <li className="flex items-start gap-2">
                      <Clock className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>
                        لا يتم تجديد الاشتراك تلقائياً
                        </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Shield className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>ضمان استرداد الأموال لمدة 14 يوم</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>يمكنك الترقية في أي وقت</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}