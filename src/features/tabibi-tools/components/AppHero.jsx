import { Badge } from "../../../components/ui/badge";
import { formatCurrency } from "../../../lib/utils";
import { Zap } from "lucide-react";
import { APPS_ICON_REGISTRY } from "../appsRegistry";

export default function AppHero({ app, isInstalled }) {
  const Icon = APPS_ICON_REGISTRY[app.icon_name] || Zap;

  const getBillingPeriodLabel = (period) => {
    const map = {
      'monthly': 'شهرياً',
      'yearly': 'سنوياً',
      'one_time': 'مرة واحدة'
    };
    return map[period] || period;
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
                 {formatCurrency(app.price)} / {getBillingPeriodLabel(app.billing_period)}
               </Badge>
              <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                {app.category}
              </Badge>
              {isInstalled && <Badge className="bg-green-500 hover:bg-green-600">مفعل</Badge>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
