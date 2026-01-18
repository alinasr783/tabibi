import { useState } from "react";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../../components/ui/dialog";
import { Loader2, Eye, Wallet, CreditCard, Phone, Zap } from "lucide-react";
import { formatCurrency } from "../../../lib/utils";
import useWallet from "../../clinic/useWallet";
import useClinic from "../../auth/useClinic";
import { subscribeWithWallet } from "../../../services/apiTabibiApps";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { initiatePayment } from "../../../services/easykashService";
import { useAuth } from "../../../features/auth/AuthContext";

export default function AppActionBar({ app, isInstalled, uninstallMutation }) {
  const { data: clinic } = useClinic();
  const { wallet, isLoading: isWalletLoading } = useWallet();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [onlinePaymentMethod, setOnlinePaymentMethod] = useState("card");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState(null);

  const handleOnlinePayment = async () => {
    try {
      setIsPaymentLoading(true);
      const result = await initiatePayment({
        amount: app.price,
        type: 'app_purchase',
        metadata: {
          app_id: app.id,
          app_name: app.title
        },
        buyer: {
          email: user?.email,
          name: user?.name,
          mobile: user?.phone
        },
        paymentMethod: onlinePaymentMethod
      });
      localStorage.setItem('pending_payment_method', onlinePaymentMethod);
      
      if (result && result.type === 'voucher') {
        const params = new URLSearchParams();
        params.set('status', 'PENDING');
        if (result.easykashRef) params.set('providerRefNum', String(result.easykashRef));
        if (result.customerReference) params.set('customerReference', String(result.customerReference));
        if (result.voucher) params.set('voucher', String(result.voucher));
        if (result.expiryDate) params.set('expiryDate', String(result.expiryDate));

        window.location.href = `/payment/callback?${params.toString()}`;
      } else if (result && result.type === 'redirect' && result.url) {
        setIsPaymentLoading(false);
        window.location.href = result.url;
      } else if (typeof result === 'string') {
        window.location.href = result;
      }
    } catch (error) {
      console.error("App Payment Error:", error);
      toast.error(error.message || "حدث خطأ أثناء بدء عملية الدفع");
      setIsPaymentLoading(false);
    }
  };

  const subscribeMutation = useMutation({
    mutationFn: () => subscribeWithWallet(clinic?.clinic_uuid, app.id),
    onSuccess: () => {
      toast.success("تم الاشتراك بنجاح! تم خصم المبلغ من محفظتك.", {
        duration: 5000,
        position: 'bottom-center',
        style: {
          background: '#F0FDF4',
          color: '#166534',
          border: '1px solid #BBF7D0',
        },
      });
      queryClient.invalidateQueries(["installed_apps"]);
      queryClient.invalidateQueries(["clinicWallet"]);
      queryClient.invalidateQueries(["walletTransactions"]);
    },
    onError: (err) => {
      toast.error(`خطأ في الاشتراك: ${err.message}`, {
        position: 'bottom-center'
      });
    }
  });

  const getBillingPeriodLabel = (period) => {
    const map = {
      'monthly': 'شهرياً',
      'yearly': 'سنوياً',
      'one_time': 'مرة واحدة'
    };
    return map[period] || period;
  };

  const walletBalance = wallet?.balance || 0;
  const canAfford = walletBalance >= app.price;

  return (
    <div>
      <div className="fixed bottom-0 left-0 right-0 w-full bg-background border-t z-50 md:pl-72 pb-[24px] md:pb-0">
        <div className="max-w-4xl mx-auto p-4 flex items-center justify-between gap-4">
          <div className="hidden md:block">
            <p className="font-bold">{app.title}</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(app.price)} / {getBillingPeriodLabel(app.billing_period)}</p>
          </div>
        
          <div className="flex items-center gap-2 w-full md:w-auto">
          {app.preview_link && (
            <Button 
              variant="outline"
              className="flex-1 md:flex-none gap-2"
              onClick={() => window.open(app.preview_link, '_blank')}
            >
              <Eye className="w-4 h-4" />
              <span>معاينة</span>
            </Button>
          )}

          {isInstalled ? (
            <Button 
                variant="outline" 
                className="flex-[2] md:w-auto md:min-w-[200px] gap-2 border-primary/20 hover:bg-primary/5"
                onClick={() => {
                    window.open("https://wa.me/201158954215", "_blank");
                }}
            >
                <Phone className="w-4 h-4 text-primary" />
                تواصل مع الدعم
            </Button>
          ) : (
            <>
              {canAfford ? (
                <Button 
                  className="flex-[2] md:w-auto md:min-w-[200px] bg-primary hover:bg-primary/90 gap-2"
                  onClick={() => subscribeMutation.mutate()}
                  disabled={subscribeMutation.isPending || isWalletLoading}
                >
                  {subscribeMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      جاري الاشتراك...
                    </>
                  ) : (
                    <>
                      <Wallet className="w-4 h-4" />
                      اشترك من محفظتك
                    </>
                  )}
                </Button>
              ) : (
                <div className="flex flex-col gap-2 flex-[2] md:w-auto md:min-w-[260px]">
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setOnlinePaymentMethod('card')}
                      className={`py-2 px-3 rounded-[var(--radius)] text-[11px] md:text-xs font-medium flex flex-col items-center gap-1 border transition-all ${
                        onlinePaymentMethod === 'card'
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>بطاقة</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOnlinePaymentMethod('wallet')}
                      className={`py-2 px-3 rounded-[var(--radius)] text-[11px] md:text-xs font-medium flex flex-col items-center gap-1 border transition-all ${
                        onlinePaymentMethod === 'wallet'
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
                      }`}
                    >
                      <Wallet className="w-4 h-4" />
                      <span>محفظة</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOnlinePaymentMethod('fawry')}
                      className={`py-2 px-3 rounded-[var(--radius)] text-[11px] md:text-xs font-medium flex flex-col items-center gap-1 border transition-all ${
                        onlinePaymentMethod === 'fawry'
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
                      }`}
                    >
                      <Zap className="w-4 h-4" />
                      <span>فوري</span>
                    </button>
                  </div>
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 gap-2"
                    onClick={handleOnlinePayment}
                    disabled={isPaymentLoading}
                  >
                    {isPaymentLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        جاري التحويل...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        ادفع اونلاين
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
          </div>
        </div>
      </div>

      <Dialog
        open={isPaymentModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsPaymentModalOpen(false);
            setPaymentUrl(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[480px] md:max-w-[640px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-center text-lg">إتمام الدفع لتفعيل التطبيق</DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground">
              يمكنك إتمام عملية الدفع دون مغادرة طبيبي.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {paymentUrl && (
              <div className="w-full rounded-[var(--radius)] border border-gray-200 overflow-hidden bg-gray-50">
                <iframe
                  src={paymentUrl}
                  title="صفحة الدفع"
                  className="w-full h-[420px]"
                  allow="payment *; fullscreen"
                />
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2 mt-4">
            <Button
              variant="outline"
              fullWidth={true}
              onClick={() => {
                setIsPaymentModalOpen(false);
                setPaymentUrl(null);
              }}
            >
              إغلاق نافذة الدفع
            </Button>
            {paymentUrl && (
              <Button
                fullWidth={true}
                onClick={() => {
                  window.location.href = paymentUrl;
                }}
              >
                فتح صفحة الدفع كاملة
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
