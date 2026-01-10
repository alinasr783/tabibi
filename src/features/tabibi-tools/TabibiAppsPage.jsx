import { useState } from "react";
import { 
  Search, 
  Bot, 
  MessageCircle, 
  BarChart3, 
  Globe, 
  ShieldCheck,
  Zap,
  ChevronRight,
  Filter,
  Loader2
} from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { getApps } from "../../services/apiTabibiApps";
import { APPS_ICON_REGISTRY } from "./appsRegistry.jsx";

import { formatCurrency } from "../../lib/utils";

export default function TabibiAppsPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const { data: apps = [], isLoading, error } = useQuery({
    queryKey: ['tabibi_apps'],
    queryFn: getApps
  });

  const filteredApps = apps.filter(app => {
    const matchesCategory = activeCategory === "All" || app.category === activeCategory;
    const matchesSearch = app.title.includes(searchQuery) || (app.short_description && app.short_description.includes(searchQuery));
    return matchesCategory && matchesSearch;
  });

  const getBillingPeriodLabel = (period) => {
    const map = {
      'monthly': 'شهرياً',
      'yearly': 'سنوياً',
      'one_time': 'مرة واحدة'
    };
    return map[period] || period;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-destructive">
        <p>حدث خطأ أثناء تحميل التطبيقات</p>
        <button onClick={() => window.location.reload()} className="underline mt-2">إعادة المحاولة</button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-6 min-h-screen pb-24 font-sans" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
          <Zap className="h-6 w-6 text-yellow-500 fill-yellow-500" />
          Tabibi Apps
        </h1>
        <p className="text-muted-foreground text-xs md:text-sm">
          متجر تطبيقات متكامل لتطوير عيادتك
        </p>
      </div>

      {/* Filter & Search Bar - Mobile Optimized */}
      <div className="bg-card p-3 rounded-xl border shadow-sm sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="ابحث عن تطبيق..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pr-9 pl-4 rounded-lg border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-shadow"
            />
          </div>

          {/* Category Select - styled like Patient Modal Gender Select */}
          <div className="w-full sm:w-[180px]">
            <Select 
              value={activeCategory} 
              onValueChange={setActiveCategory} 
              dir="rtl"
            >
              <SelectTrigger className="h-10 w-full bg-background border-input">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Filter className="h-4 w-4" />
                  <SelectValue placeholder="التصنيف" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">الكل</SelectItem>
                <SelectItem value="AI">الذكاء الاصطناعي</SelectItem>
                <SelectItem value="Marketing">التسويق</SelectItem>
                <SelectItem value="Management">الإدارة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Apps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredApps.map((app) => {
          const Icon = APPS_ICON_REGISTRY[app.icon_name] || Zap;
          return (
            <Card 
              key={app.id} 
              className="group hover:shadow-md transition-all duration-200 cursor-pointer border-muted hover:border-primary/50 overflow-hidden active:scale-[0.98]"
              onClick={() => navigate(`/tabibi-apps/${app.id}`)}
            >
              <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                {/* Image or Icon Container */}
                {app.image_url ? (
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-lg overflow-hidden shrink-0 border bg-muted">
                    <img src={app.image_url} alt={app.title} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className={`p-2.5 rounded-lg ${app.color} flex-shrink-0 transition-transform group-hover:scale-105`}>
                    <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-bold text-sm sm:text-base text-foreground truncate">{app.title}</h3>
                    <span className="text-[10px] sm:text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full whitespace-nowrap">
                      {formatCurrency(app.price)} / {getBillingPeriodLabel(app.billing_period)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {app.short_description}
                  </p>
                </div>

                {/* Arrow */}
                <div className="flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors">
                  <ChevronRight className="h-4 w-4 rotate-180" /> 
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Empty State */}
      {filteredApps.length === 0 && (
        <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed">
          <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
            <Search className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-base font-medium text-foreground">لا توجد نتائج</h3>
          <p className="text-muted-foreground text-xs mt-1">جرب البحث بكلمات مختلفة أو تغيير التصنيف</p>
        </div>
      )}
    </div>
  );
}
// Remove old static data

