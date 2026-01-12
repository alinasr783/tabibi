import { Button } from "../../../components/ui/button";
import { Loader2, Eye, Wallet } from "lucide-react";
import { formatCurrency } from "../../../lib/utils";
import useWallet from "../../clinic/useWallet";
import useClinic from "../../auth/useClinic";
import { subscribeWithWallet } from "../../../services/apiTabibiApps";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

export default function AppActionBar({ app, isInstalled, uninstallMutation }) {
  const { data: clinic } = useClinic();
  const { wallet, isLoading: isWalletLoading } = useWallet();
  const queryClient = useQueryClient();

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
              variant="destructive" 
              className="flex-[2] md:w-auto md:min-w-[200px]"
              onClick={() => uninstallMutation.mutate()}
              disabled={uninstallMutation.isLoading}
            >
              {uninstallMutation.isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  جاري الإلغاء...
                </>
              ) : (
                "إلغاء التفعيل"
              )}
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
                <Button 
                  className="flex-[2] md:w-auto md:min-w-[200px] bg-green-600 hover:bg-green-700"
                  onClick={() => window.open('https://wa.me/201000000000?text=' + encodeURIComponent(`مرحباً، أود تفعيل تطبيق ${app.title}`), '_blank')}
                >
                  تواصل مع الدعم للتفعيل
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
