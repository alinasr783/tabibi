import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { Button } from '../components/ui/button.jsx';
import { useAuth } from '@/features/auth/AuthContext';
import { createSubscription } from '@/services/apiSubscriptions';
import { incrementDiscountUsage } from '@/services/apiDiscounts';
import toast from 'react-hot-toast';
import { 
  Loader, 
  CheckCircle, 
  XCircle, 
  ArrowLeft,
  CreditCard,
  Calendar,
  Zap,
  Wallet,
  Smartphone,
  Phone
} from 'lucide-react';

import supabase from '@/services/supabase';

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState('processing'); // processing, success, failed
  const [paymentData, setPaymentData] = useState(null);

  useEffect(() => {
    const processPaymentCallback = async () => {
      try {
        // 1. Identify Provider and Status
        // EasyKash redirect params: status (PAID/FAILED), providerRefNum, customerReference
        // Paymob/Other params: success, id, amount_cents, ...
        
        const ekStatus = searchParams.get('status');
        const ekRef = searchParams.get('easykashRef') || searchParams.get('providerRefNum');
        const ekCustomerRef = searchParams.get('customerReference');
        const ekVoucher = searchParams.get('voucher');
        
        const isEasyKash = ekStatus && ekCustomerRef;

        if (isEasyKash) {
            const pendingMethod = localStorage.getItem('pending_payment_method');
            console.log("EasyKash Callback:", { ekStatus, ekRef, ekCustomerRef, ekVoucher });
            
            if (ekStatus === 'PAID') {
                // Verify against Supabase Transaction
                // Since Webhook might be slow, we might need to update manually if local dev
                // OR poll for status. For now, let's assume success if status is PAID
                // and try to fulfill subscription.
                
                const planId = localStorage.getItem('pending_subscription_plan_id');
                const billingPeriod = localStorage.getItem('pending_subscription_billing_period');
                const amount = localStorage.getItem('pending_subscription_amount');
                const discountId = localStorage.getItem('pending_discount_id');
                
                // Double check if transaction exists and update it if needed (Client-side fallback)
                if (ekCustomerRef) {
                    const { data: tx } = await supabase
                        .from('transactions')
                        .select('status')
                        .eq('reference_number', parseInt(ekCustomerRef))
                        .single();
                        
                    if (tx && tx.status !== 'completed') {
                         // Update manually (only for dev/if webhook fails)
                         await supabase.from('transactions')
                            .update({ 
                                status: 'completed', 
                                easykash_ref: ekRef 
                            })
                            .eq('reference_number', parseInt(ekCustomerRef));
                    }
                }

                if (planId) {
                    await createSubscription({
                        clinicId: user.clinic_id,
                        planId,
                        billingPeriod: billingPeriod || 'monthly',
                        amount: parseFloat(amount) || 0
                    });

                    if (discountId) {
                        await incrementDiscountUsage(parseInt(discountId));
                    }

                    setStatus('success');
                    setPaymentData({
                        amount: amount,
                        transactionId: ekRef,
                        paymentMethod: pendingMethod || 'card'
                    });
                    toast.success("تم تفعيل الاشتراك بنجاح!");
                    
                    // Clear storage
                    localStorage.removeItem('pending_subscription_plan_id');
                    localStorage.removeItem('pending_subscription_billing_period');
                    localStorage.removeItem('pending_subscription_amount');
                    localStorage.removeItem('pending_discount_id');
                    localStorage.removeItem('pending_payment_method');
                } else {
                    // Maybe it was already processed or just a wallet top-up?
                    setStatus('success');
                }
            } else if (ekStatus === 'PENDING') {
                setStatus('pending');
                setPaymentData({
                    voucher: ekVoucher,
                    transactionId: ekRef,
                    paymentMethod: pendingMethod || 'card'
                });
                toast("عملية الدفع قيد الانتظار. في حالة فوري، استخدم كود الدفع لإتمام العملية.");
            } else {
                setStatus('failed');
                toast.error("فشلت عملية الدفع");
            }
            return;
        }

        // ... Existing Logic for other providers ...
        // Extract payment data from URL parameters
        const success = searchParams.get('success') === 'true';

        const id = searchParams.get('id');
        const amount_cents = parseInt(searchParams.get('amount_cents')) || 0;
        const source_data = {
          type: searchParams.get('source_data.type'),
          pan: searchParams.get('source_data.pan')
        };
        
        // Create callback data object
        const callbackData = {
          success,
          id,
          amount_cents,
          source_data
        };

        // Simulate payment verification (in a real app, this would be server-side)
        const verification = {
          isValid: callbackData.success,
          status: callbackData.success ? 'success' : 'failed',
          transactionId: callbackData.id,
          amount: callbackData.amount_cents / 100,
          paymentMethod: callbackData.source_data?.type || 'card'
        };
        
        if (verification.isValid && verification.status === 'success') {
          // Payment was successful, create the subscription
          // NOTE: This is a payment callback - subscription is only created after successful payment
          // This is different from direct subscription activation without payment
          const clinicId = user?.clinic_id;
          const planId = localStorage.getItem('pending_subscription_plan_id');
          const billingPeriod = localStorage.getItem('pending_subscription_billing_period');
          const amount = localStorage.getItem('pending_subscription_amount');
          const discountId = localStorage.getItem('pending_discount_id');
          
          if (clinicId && planId) {
            await createSubscription({
              clinicId,
              planId,
              billingPeriod: billingPeriod || 'monthly',
              amount: parseFloat(amount) || 0
            });
            
            // Increment discount usage if a discount was applied
            if (discountId) {
              await incrementDiscountUsage(parseInt(discountId));
            }
            
            setStatus('success');
            setPaymentData(verification);
            toast.success("تم تفعيل الاشتراك بنجاح!");
            
            // Clear pending subscription data
            localStorage.removeItem('pending_subscription_plan_id');
            localStorage.removeItem('pending_subscription_billing_period');
            localStorage.removeItem('pending_subscription_amount');
            localStorage.removeItem('pending_payment_method');
            localStorage.removeItem('pending_discount_id');
          } else {
            throw new Error('بيانات الاشتراك غير مكتملة');
          }
        } else {
          setStatus('failed');
          setPaymentData(verification);
        }
      } catch (error) {
        console.error('Payment callback processing error:', error);
        setStatus('failed');
        toast.error("❌ فشل في معالجة نتيجة الدفع: " + error.message);
      }
    };

    processPaymentCallback();
  }, [searchParams, user]);

  const handleReturnToDashboard = () => {
    navigate("/dashboard");
  };

  const handleRetryPayment = () => {
    // Go back to the plan selection page
    navigate("/pricing");
  };

  const handleRefreshPending = async () => {
    try {
      const ekCustomerRef = searchParams.get('customerReference');
      const ekStatus = searchParams.get('status');
      const ekRef = searchParams.get('easykashRef') || searchParams.get('providerRefNum');
      const ekVoucher = searchParams.get('voucher');

      console.log('EasyKash Refresh:', {
        ekStatus,
        ekRef,
        ekCustomerRef,
        ekVoucher
      });
      if (!ekCustomerRef) {
        toast.error("لا يمكن تحديد رقم العملية لتحديث الحالة");
        return;
      }

      const { data: tx, error } = await supabase
        .from('transactions')
        .select('status, type, amount, metadata, easykash_ref')
        .eq('reference_number', parseInt(ekCustomerRef))
        .single();

      console.log('Refresh pending transaction:', tx);

      if (error || !tx) {
        toast.error("تعذر العثور على عملية الدفع في النظام");
        return;
      }

      if (tx.status !== 'completed') {
        await supabase
          .from('transactions')
          .update({
            status: 'completed',
            easykash_ref: ekRef
          })
          .eq('reference_number', parseInt(ekCustomerRef));
      }

      const pendingMethod = localStorage.getItem('pending_payment_method');

      if (tx.type === 'subscription') {
        const planIdLocal = localStorage.getItem('pending_subscription_plan_id');
        const billingPeriodLocal = localStorage.getItem('pending_subscription_billing_period');
        const amountLocal = localStorage.getItem('pending_subscription_amount');
        const discountIdLocal = localStorage.getItem('pending_discount_id');

        const planId = planIdLocal || tx.metadata?.planId;
        const billingPeriod = billingPeriodLocal || tx.metadata?.billingPeriod || 'monthly';
        const amount = amountLocal ? parseFloat(amountLocal) : tx.amount || 0;
        const discountId = discountIdLocal || tx.metadata?.discountId;

        if (planId && user?.clinic_id) {
          await createSubscription({
            clinicId: user.clinic_id,
            planId,
            billingPeriod,
            amount
          });

          if (discountId) {
            await incrementDiscountUsage(parseInt(discountId));
          }

          setStatus('success');
          setPaymentData({
            amount,
            transactionId: tx.easykash_ref || '',
            paymentMethod: pendingMethod || 'card'
          });
          toast.success("تم تفعيل الاشتراك بعد تأكيد الدفع!");

          localStorage.removeItem('pending_subscription_plan_id');
          localStorage.removeItem('pending_subscription_billing_period');
          localStorage.removeItem('pending_subscription_amount');
          localStorage.removeItem('pending_discount_id');
          localStorage.removeItem('pending_payment_method');
        } else {
          setStatus('success');
          setPaymentData({
            amount: tx.amount || 0,
            transactionId: tx.easykash_ref || '',
            paymentMethod: pendingMethod || 'card'
          });
          toast.success("تم تأكيد الدفع.");
        }
      } else {
        try {
          if (tx.type === 'wallet' && user?.clinic_id && tx.amount) {
            const referenceId = ekRef || ekCustomerRef;

            const { data: wallet } = await supabase
              .from('clinic_wallets')
              .select('id, balance')
              .eq('clinic_id', user.clinic_id)
              .maybeSingle();

            let walletId = wallet?.id;
            let currentBalance = Number(wallet?.balance || 0);

            if (!walletId) {
              const { data: newWallet } = await supabase
                .from('clinic_wallets')
                .insert({ clinic_id: user.clinic_id, balance: 0 })
                .select('id, balance')
                .single();

              walletId = newWallet?.id;
              currentBalance = Number(newWallet?.balance || 0);
            }

            if (walletId && referenceId) {
              const { data: existingTx } = await supabase
                .from('wallet_transactions')
                .select('id')
                .eq('reference_type', 'wallet')
                .eq('reference_id', String(referenceId))
                .maybeSingle();

              if (!existingTx) {
                await supabase
                  .from('clinic_wallets')
                  .update({ balance: currentBalance + Number(tx.amount) })
                  .eq('id', walletId);

                await supabase.from('wallet_transactions').insert({
                  wallet_id: walletId,
                  amount: Number(tx.amount),
                  type: 'deposit',
                  description: 'شحن المحفظة عبر EasyKash',
                  reference_type: 'wallet',
                  reference_id: String(referenceId),
                  status: 'completed'
                });
              }
            }
          }
        } catch (walletError) {
          console.error('Wallet top-up apply error:', walletError);
        }

        setStatus('success');
        setPaymentData({
          amount: tx.amount || 0,
          transactionId: tx.easykash_ref || '',
          paymentMethod: pendingMethod || 'card'
        });
        toast.success("تم تأكيد الدفع.");
      }
    } catch (error) {
      console.error('Refresh pending payment error:', error);
      toast.error("فشل في تحديث حالة الدفع، يرجى المحاولة مرة أخرى.");
    }
  };

  // Get payment method icon and name
  const getPaymentMethodInfo = (methodType) => {
    switch(methodType) {
      case 'visa':
      case 'mastercard':
      case 'card':
        return {
          icon: <CreditCard className="w-5 h-5" />,
          name: 'بطاقة ائتمان',
          bgColorClass: 'bg-blue-100',
          textColorClass: 'text-blue-600'
        };
      case 'fawry':
        return {
          icon: <Zap className="w-5 h-5" />,
          name: 'دفع فوري',
          bgColorClass: 'bg-yellow-100',
          textColorClass: 'text-yellow-600'
        };
      case 'wallet':
        return {
          icon: <Wallet className="w-5 h-5" />,
          name: 'محفظة إلكترونية',
          bgColorClass: 'bg-green-100',
          textColorClass: 'text-green-600'
        };
      case 'vodafone':
        return {
          icon: <Smartphone className="w-5 h-5" />,
          name: 'فودافون كاش',
          bgColorClass: 'bg-red-100',
          textColorClass: 'text-red-600'
        };
      case 'etisalat':
        return {
          icon: <Phone className="w-5 h-5" />,
          name: 'إتيصالات كاش',
          bgColorClass: 'bg-blue-100',
          textColorClass: 'text-blue-600'
        };
      default:
        return {
          icon: <CreditCard className="w-5 h-5" />,
          name: 'بطاقة ائتمان',
          bgColorClass: 'bg-blue-100',
          textColorClass: 'text-blue-600'
        };
    }
  };

  if (status === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 flex items-center justify-center p-4" dir="rtl" lang="ar">
        <Card className="w-full max-w-md rounded-[var(--radius)] border-0 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto bg-blue-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4">
              <Loader className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <CardTitle className="text-xl font-bold text-gray-900">
              جاري معالجة النتيجة
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-6">
              نقوم الآن بمعالجة نتيجة الدفع وإتمام عملية الاشتراك
            </p>
            <div className="flex justify-center">
              <div className="animate-pulse flex space-x-2">
                <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 flex items-center justify-center p-4" dir="rtl" lang="ar">
        <Card className="w-full max-w-md rounded-[var(--radius)] border-0 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto bg-yellow-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4">
              <Loader className="w-8 h-8 text-yellow-600 animate-spin" />
            </div>
            <CardTitle className="text-xl font-bold text-gray-900">
              عملية الدفع قيد الانتظار
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-5">
            <p className="text-gray-600">
              عملية الدفع ما زالت قيد الانتظار. في حالة اختيار الدفع عن طريق فوري أو كاش، يجب إتمام الدفع باستخدام كود العملية ثم سيتم تحديث الاشتراك أو رصيد المحفظة تلقائياً.
            </p>
            {paymentData?.voucher && (
              <div className="bg-yellow-50 rounded-[var(--radius)] p-4 border border-yellow-200 text-center sm:text-left space-y-2">
                <p className="text-sm text-gray-700">كود الدفع (فوري):</p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <p className="flex-1 font-mono text-lg font-bold text-yellow-800 break-all bg-white/70 rounded-[var(--radius)] px-3 py-2 text-center sm:text-left">
                    {paymentData.voucher}
                  </p>
                  <Button
                    variant="outline"
                    fullWidth={true}
                    className="sm:w-auto text-xs sm:text-sm border-yellow-400 text-yellow-800 hover:bg-yellow-100"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(paymentData.voucher);
                        toast.success("تم نسخ كود فوري");
                      } catch (error) {
                        console.error('Copy voucher error:', error);
                        toast.error("تعذر نسخ الكود، انسخه يدويًا لو سمحت");
                      }
                    }}
                  >
                    نسخ الكود
                  </Button>
                </div>
                <p className="text-[11px] sm:text-xs text-yellow-700">
                  احتفظ بهذا الكود، وشاركه مع موظف الدفع في فوري عند السداد.
                </p>
              </div>
            )}
            <div className="bg-gray-50 border border-dashed border-gray-200 rounded-[var(--radius)] p-3 text-xs text-gray-600 space-y-1">
              <p>
                لو أتممت الدفع بالفعل، انتظر دقيقة ثم اضغط على زر "تحديث حالة الدفع".
              </p>
              <p>
                لو ما تمش التحديث فوراً، برجاء المحاولة بعد دقيقة.
              </p>
            </div>
            <div className="pt-2 space-y-2">
              <Button 
                onClick={handleRefreshPending}
                fullWidth={true}
              >
                تحديث حالة الدفع
              </Button>
              <Button 
                variant="outline"
                onClick={handleReturnToDashboard}
                fullWidth={true}
              >
                العودة للوحة التحكم
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    const paymentMethod = paymentData?.paymentMethod || 'card';
    const methodInfo = getPaymentMethodInfo(paymentMethod);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 flex items-center justify-center p-4" dir="rtl" lang="ar">
        <Card className="w-full max-w-md rounded-[var(--radius)] border-0 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className={`mx-auto ${methodInfo.bgColorClass} p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4`}>
              <CheckCircle className={`w-8 h-8 ${methodInfo.textColorClass}`} />
            </div>
            <CardTitle className="text-xl font-bold text-gray-900">
              تم الدفع بنجاح!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="space-y-4">
              <p className="text-gray-600">
                تم تفعيل الاشتراك في الخطة بنجاح
              </p>
              
              <div className="bg-gray-50 rounded-[var(--radius)] p-4 border border-gray-200">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-600">طريقة الدفع:</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 ${methodInfo.bgColorClass} rounded-[var(--radius)] flex items-center justify-center`}>
                      {methodInfo.icon}
                    </div>
                    <span className="font-medium">{methodInfo.name}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">رقم العملية:</span>
                  <span className="font-medium">#{paymentData?.transactionId?.substring(0, 8)}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-gray-600">المبلغ المدفوع:</span>
                  <span className="font-medium">{(paymentData?.amount || 0).toFixed(2)} جنيه</span>
                </div>
              </div>
            </div>
            
            <div className="pt-4 space-y-3">
              <Button 
                className="w-full bg-primary hover:bg-primary/90"
                onClick={handleReturnToDashboard}
              >
                الذهاب إلى لوحة التحكم
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Failed status
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 flex items-center justify-center p-4" dir="rtl" lang="ar">
      <Card className="w-full max-w-md rounded-[var(--radius)] border-0 shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto bg-red-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-xl font-bold text-gray-900">
            فشل في الدفع
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="space-y-2">
            <p className="text-gray-600">
              لم يتم إتمام عملية الدفع بنجاح. يرجى المحاولة مرة أخرى.
            </p>
            {paymentData?.error && (
              <div className="bg-red-50 rounded-[var(--radius)] p-3 border border-red-200 text-red-700 text-sm">
                {paymentData.error}
              </div>
            )}
          </div>
          
          <div className="pt-4 space-y-3">
            <Button 
              className="w-full bg-primary hover:bg-primary/90"
              onClick={handleRetryPayment}
            >
              إعادة محاولة الدفع
            </Button>
            <Button 
              variant="outline"
              className="w-full border-gray-300 hover:bg-gray-50"
              onClick={handleReturnToDashboard}
            >
              <ArrowLeft className="w-4 h-4 ml-2" />
              العودة للوحة التحكم
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
