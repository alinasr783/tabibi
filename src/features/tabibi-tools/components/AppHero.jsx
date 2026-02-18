import { Badge } from "../../../components/ui/badge";
import { formatCurrency } from "../../../lib/utils";
import { Zap, Layers } from "lucide-react";
import { APPS_ICON_REGISTRY } from "../appsRegistry";

export default function AppHero({ app, isInstalled }) {
  const Icon = APPS_ICON_REGISTRY[app.icon_name] || Zap;
  const isIntegrationSupported = app.integration_type && app.integration_type !== 'none';

  const getBillingPeriodLabel = (period) => {
    const map = {
      'monthly': 'شهرياً',
      'yearly': 'سنوياً',
      'one_time': 'مرة واحدة'
    };
    return map[period] || period;
  };

  const formatInterval = (unit, count) => {
    const n = Math.max(1, Number(count) || 1);
    const labels = {
      day: n === 1 ? "يوم" : "أيام",
      week: n === 1 ? "أسبوع" : "أسابيع",
      month: n === 1 ? "شهر" : "شهور",
      year: n === 1 ? "سنة" : "سنوات",
    };
    const u = labels[unit] || (n === 1 ? "شهر" : "شهور");
    return n === 1 ? u : `${n} ${u}`;
  };

  const getPricingLabel = () => {
    const pricingType = app.pricing_type || ((Number(app.price) || 0) > 0 ? "paid" : "free");
    const paymentType = app.payment_type || (app.billing_period === "one_time" ? "one_time" : "recurring");
    const unit = app.billing_interval_unit || (app.billing_period === "yearly" ? "year" : "month");
    const count = app.billing_interval_count ?? 1;
    const trialUnit = app.trial_interval_unit || "day";
    const trialCount = app.trial_interval_count ?? 7;

    if (pricingType === "free") return "مجاني";

    if (pricingType === "trial_then_paid") {
      const paidPart =
        paymentType === "one_time"
          ? `${formatCurrency(app.price)} (مرة واحدة)`
          : `${formatCurrency(app.price)} / ${formatInterval(unit, count)}`;
      return `مجاني ${formatInterval(trialUnit, trialCount)} ثم ${paidPart}`;
    }

    if (paymentType === "one_time") return `${formatCurrency(app.price)} (مرة واحدة)`;

    if (app.billing_interval_unit || app.billing_interval_count) {
      return `${formatCurrency(app.price)} / ${formatInterval(unit, count)}`;
    }

    return `${formatCurrency(app.price)} / ${getBillingPeriodLabel(app.billing_period)}`;
  };

  return (
    <div className="w-full bg-background">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="flex gap-4 items-start">
          {app.image_url ? (
             <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden border bg-muted shrink-0">
               <img src={app.image_url} alt={app.title} className="w-full h-full object-cover" />
             </div>
          ) : (
            <div className={`p-3 md:p-4 rounded-2xl ${app.color} shrink-0`}>
              <Icon className="h-10 w-10 md:h-12 md:w-12" />
            </div>
          )}
          
          <div className="flex-1 space-y-2">
            <h2 className="text-xl md:text-2xl font-bold">{app.title}</h2>
            <p className="text-muted-foreground text-sm md:text-base">{app.short_description}</p>
            
            <div className="flex flex-wrap items-center gap-2 mt-2">
               <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                 {getPricingLabel()}
               </Badge>
              <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                {app.category}
              </Badge>
              {isIntegrationSupported && (
                <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  يدعم الدمج
                </Badge>
              )}
              {isInstalled && <Badge className="bg-green-500 hover:bg-green-600">مفعل</Badge>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
