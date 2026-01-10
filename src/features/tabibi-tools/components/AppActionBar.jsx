import { Button } from "../../../components/ui/button";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "../../../lib/utils";

export default function AppActionBar({ app, isInstalled, installMutation, uninstallMutation }) {
  const getBillingPeriodLabel = (period) => {
    const map = {
      'monthly': 'شهرياً',
      'yearly': 'سنوياً',
      'one_time': 'مرة واحدة'
    };
    return map[period] || period;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 w-full bg-background border-t z-50 md:pl-72 pb-[24px] md:pb-0">
      <div className="max-w-4xl mx-auto p-4 flex items-center gap-4">
        <div className="hidden md:block">
          <p className="font-bold">{app.title}</p>
          <p className="text-xs text-muted-foreground">{formatCurrency(app.price)} / {getBillingPeriodLabel(app.billing_period)}</p>
        </div>
        
        {isInstalled ? (
          <Button 
            variant="destructive" 
            className="w-full md:w-auto md:min-w-[200px]"
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
          <Button 
            className="w-full md:w-auto md:min-w-[200px]"
            onClick={() => installMutation.mutate()}
            disabled={installMutation.isLoading}
          >
            {installMutation.isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                جاري التفعيل...
              </>
            ) : (
              `تفعيل التطبيق (${formatCurrency(app.price)})`
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
