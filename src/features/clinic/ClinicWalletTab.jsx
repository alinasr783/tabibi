import { useState } from "react";
import { Wallet, CreditCard, AppWindow, TrendingUp, Calendar, AlertCircle, Plus, History, Check, Zap, Loader2, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Separator } from "../../components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import usePlan from "../auth/usePlan";
import useInstalledApps from "./useInstalledApps";
import useWallet from "./useWallet";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Skeleton } from "../../components/ui/skeleton";
import { initiatePayment } from "@/services/easykashService";
import { toast } from "react-hot-toast";
import { useAuth } from "@/features/auth/AuthContext";

export default function ClinicWalletTab() {
  const { data: planData, isLoading } = usePlan();
  const { data: installedApps, isLoading: isAppsLoading } = useInstalledApps();
  const { wallet, transactions, isLoading: isWalletLoading } = useWallet();
  const { user } = useAuth();
  
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);

  const handleTopUp = async () => {
    if (!topUpAmount || isNaN(topUpAmount) || parseFloat(topUpAmount) <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح");
      return;
    }

    try {
      setIsPaymentLoading(true);
      const result = await initiatePayment({
        amount: parseFloat(topUpAmount),
        type: 'wallet',
        buyer: {
          email: user?.email,
          name: user?.name,
          mobile: user?.phone
        }
      });
      

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
      console.error("Top-up Error:", error);
      toast.error(error.message || "حدث خطأ أثناء بدء عملية الشحن");
      setIsPaymentLoading(false);
    }
  };
  
  const walletBalance = wallet?.balance || 0;
  const topUpAmountNumber = parseFloat(topUpAmount) || 0;
  const hasValidTopUpAmount = !isNaN(topUpAmountNumber) && topUpAmountNumber > 0;
  const expectedBalanceAfterTopUp = walletBalance + (hasValidTopUpAmount ? topUpAmountNumber : 0);

  const activeApps = installedApps || [];

  if (isLoading || isAppsLoading || isWalletLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const currentPlan = planData?.plans;
  const planPrice = parseFloat(currentPlan?.price || 0);
  const appsTotal = activeApps.reduce((acc, app) => acc + (parseFloat(app.price) || 0), 0);
  const totalPeriodCost = planPrice + appsTotal;
  const isAnnual = planData?.billing_period === 'annual';
  
  // Determine payment frequency label
  const frequencyLabel = isAnnual ? "سنوياً" : "شهرياً";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Wallet Balance Card */}
        <Card className="bg-primary/5 border-primary/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-24 h-24 bg-primary/10 rounded-full -translate-x-8 -translate-y-8" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              رصيد المحفظة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-3xl font-bold text-foreground">{walletBalance.toFixed(2)}</span>
              <span className="text-sm font-medium text-muted-foreground">جنيه</span>
            </div>
            <Button className="w-full gap-2" size="sm" onClick={() => setIsTopUpOpen(true)}>
              <Plus className="w-4 h-4" />
              شحن الرصيد
            </Button>
          </CardContent>
        </Card>

        {/* Top Up Dialog */}
        <Dialog open={isTopUpOpen} onOpenChange={setIsTopUpOpen}>
          <DialogContent className="sm:max-w-[425px]" dir="rtl">
            <DialogHeader>
              <DialogTitle>شحن المحفظة</DialogTitle>
              <DialogDescription>
                اختر المبلغ المناسب لشحن محفظتك، ويمكنك تعديل القيمة يدويًا في أي وقت.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="bg-primary/5 border border-primary/10 rounded-[var(--radius)] p-3 text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">رصيدك الحالي</span>
                  <span className="font-semibold text-foreground">
                    {walletBalance.toFixed(2)} جنيه
                  </span>
                </div>
                {hasValidTopUpAmount && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">الرصيد بعد الشحن</span>
                    <span className="font-semibold text-primary">
                      {expectedBalanceAfterTopUp.toFixed(2)} جنيه
                    </span>
                  </div>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amount">المبلغ (جنيه)</Label>
                <div className="flex flex-col gap-2">
                  <Input
                    id="amount"
                    type="number"
                    min="1"
                    placeholder="0.00"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                  />
                </div>
              </div>
              
            </div>
            <DialogFooter className="pt-2">
              <div className="flex flex-col w-full gap-2">
                <div className="flex w-full gap-2">
                  <Button
                    onClick={handleTopUp}
                    disabled={isPaymentLoading}
                    className="w-3/4"
                  >
                    {isPaymentLoading ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        جاري التحويل...
                      </>
                    ) : (
                      "تأكيد الدفع"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsTopUpOpen(false)}
                    className="w-1/4"
                  >
                    إلغاء
                  </Button>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => window.open("https://wa.me/+201158954215", "_blank")}
                  className="w-full gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  شحن عبر تواصل مع فريق الدعم
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Current Plan Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-500" />
              الباقة الحالية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold">{currentPlan?.name || "الباقة المجانية"}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {planData?.current_period_end ? (
                    <>تتجدد في {format(new Date(planData.current_period_end), "d MMMM yyyy", { locale: ar })}</>
                  ) : "غير محدد"}
                </p>
              </div>
              <Badge variant={currentPlan ? "default" : "secondary"}>
                {currentPlan ? "نشطة" : "مجانية"}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm mb-4">
              <span className="text-muted-foreground">قيمة الاشتراك:</span>
              <span className="font-bold">{planPrice} جنيه / {frequencyLabel}</span>
            </div>
            <Button 
              variant="outline" 
              className="w-full gap-2"
              onClick={() => window.open("https://wa.me/+201158954215", "_blank")}
            >
              <MessageCircle className="w-4 h-4" />
              تجديد الباقة عبر فريق الدعم
            </Button>
          </CardContent>
        </Card>

        {/* Total Expected Payment */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-green-600" />
              إجمالي المدفوعات {frequencyLabel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-3xl font-bold text-foreground">{totalPeriodCost.toFixed(2)}</span>
              <span className="text-sm font-medium text-muted-foreground">جنيه</span>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>الباقة الأساسية:</span>
                <span>{planPrice} جنيه</span>
              </div>
              <div className="flex justify-between">
                <span>الإضافات والتطبيقات:</span>
                <span>{appsTotal} جنيه</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Apps & Add-ons Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AppWindow className="w-5 h-5 text-purple-500" />
                التطبيقات 
              </CardTitle>
              <CardDescription className="mt-1.5">
                الخدمات الإضافية المفعلة
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              تصفح المتجر
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {activeApps.length > 0 ? (
            <div className="space-y-4">
              {activeApps.map((app) => (
                <div key={app.id} className="flex items-center justify-between p-4 border rounded-lg bg-card/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <AppWindow className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold">{app.title}</h4>
                      <p className="text-sm text-muted-foreground">{app.price} جنيه / {app.billing_period === 'monthly' ? 'شهر' : 'سنة'}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="gap-1 border-green-200 bg-green-50 text-green-700">
                    <Check className="w-3 h-3" />
                    مفعل
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-muted/20 rounded-lg border border-dashed">
              <AppWindow className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="font-medium text-muted-foreground">لا توجد تطبيقات مفعلة حالياً</h3>
              <p className="text-sm text-muted-foreground/70 mt-1 max-w-xs mx-auto">
                يمكنك تفعيل خدمات إضافية مثل رسائل الواتساب والرسائل القصيرة من المتجر
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-muted-foreground" />
            سجل العمليات المالية
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <div className="space-y-4">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between gap-3 p-4 border rounded-lg bg-card/50"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`p-2 rounded-lg ${tx.amount > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {tx.amount > 0 ? <TrendingUp className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm line-clamp-1 sm:line-clamp-2 break-words">
                        {tx.description}
                      </h4>
                      <p className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(tx.created_at), "d MMMM", { locale: ar })}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`font-bold text-sm sm:text-base text-nowrap shrink-0 ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {tx.amount > 0 ? '+' : ''}{tx.amount} ج
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              لا توجد عمليات سابقة لعرضها
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
