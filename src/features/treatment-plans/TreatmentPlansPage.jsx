import { Search, Plus, FileText, Calendar, Filter, Banknote, TrendingUp, Activity } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import TreatmentTemplateCreateDialog from "./TreatmentTemplateCreateDialog";
import TreatmentTemplatesList from "./TreatmentTemplatesList";
import useTreatmentTemplates from "./useTreatmentTemplates";
import useScrollToTop from "../../hooks/useScrollToTop";
import SortableStat from "../../components/ui/sortable-stat";
import { SkeletonLine } from "../../components/ui/skeleton";
import { formatCurrency } from "../../lib/utils";

function StatCard({ icon: Icon, label, value, isLoading, iconColorClass = "bg-primary/10 text-primary", onClick, active }) {
  return (
    <Card 
      className={`bg-card/70 h-full transition-all duration-200 ${onClick ? 'cursor-pointer hover:bg-accent/50' : ''} ${active ? 'ring-2 ring-primary border-primary' : ''}`}
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-3 py-3">
        <div className={`size-8 rounded-[calc(var(--radius)-4px)] grid place-items-center ${iconColorClass}`}>
          <Icon className="size-4" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          {isLoading ? (
            <SkeletonLine className="h-4 w-8" />
          ) : (
            <div className="text-lg font-semibold text-black">{value}</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function TreatmentPlansPage() {
  useScrollToTop();
  const [query, setQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Stats filtering
  const [statsFilter, setStatsFilter] = useState("month");
  const [activeStat, setActiveStat] = useState(null);

  // Data fetching
  const { data: templates, isLoading, error } = useTreatmentTemplates();

  // Filter templates based on search term
  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    if (!query) return templates;
    
    const term = query.toLowerCase();
    return templates.filter(template => 
      template.name.toLowerCase().includes(term) ||
      (template.description && template.description.toLowerCase().includes(term))
    );
  }, [templates, query]);

  // Calculate Stats
  const stats = useMemo(() => {
    if (!templates) return { total: 0, usages: 0, revenue: 0, avgPrice: 0 };
    
    const total = templates.length;
    
    // Date filtering logic
    const now = new Date();
    let startDate = new Date(0); // Default to beginning of time
    
    if (statsFilter === 'week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (statsFilter === 'month') {
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
    } else if (statsFilter === 'threeMonths') {
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 3);
    }
    
    // Calculate stats based on filtered usages
    let usages = 0;
    let revenue = 0;
    
    templates.forEach(t => {
      if (t.rawUsages) {
        const filteredUsages = t.rawUsages.filter(u => new Date(u.created_at) >= startDate);
        usages += filteredUsages.length;
        revenue += filteredUsages.reduce((sum, u) => sum + (Number(u.total_price) || 0), 0);
      }
    });
    
    const totalPrice = templates.reduce((sum, t) => sum + (parseFloat(t.session_price) || 0), 0);
    const avgPrice = total > 0 ? totalPrice / total : 0;

    return { total, usages, revenue, avgPrice };
  }, [templates, statsFilter]);

  const defaultOrder = ["total", "usages", "revenue", "avgPrice"];

  const [cardsOrder, setCardsOrder] = useState(() => {
    try {
      const saved = localStorage.getItem("treatment_plans_stats_order");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const uniqueKeys = new Set([...parsed, ...defaultOrder]);
          return Array.from(uniqueKeys);
        }
      }
    } catch (e) {
      console.error("Failed to load stats order", e);
    }
    return defaultOrder;
  });

  useEffect(() => {
    localStorage.setItem("treatment_plans_stats_order", JSON.stringify(cardsOrder));
  }, [cardsOrder]);

  const moveCard = useCallback((dragIndex, hoverIndex) => {
    setCardsOrder((prevCards) => {
      const newCards = [...prevCards];
      const draggedCard = newCards[dragIndex];
      newCards.splice(dragIndex, 1);
      newCards.splice(hoverIndex, 0, draggedCard);
      return newCards;
    });
  }, []);

  const toggleStatFilter = (stat) => {
    if (activeStat === stat) {
      setActiveStat(null);
    } else {
      setActiveStat(stat);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 space-y-6" dir="rtl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-[var(--radius)] bg-primary/10 text-primary">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">إدارة الخطط العلاجية</h1>
            <p className="text-sm text-muted-foreground">{stats.lastWeekUsages} استخدام جديد اخر اسبوع</p>
          </div>
        </div>
      </div>

      {/* Stats Filter & Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            احصائيات خططك العلاجية
          </h3>
          <Select value={statsFilter} onValueChange={setStatsFilter}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="اختر الفترة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">اخر اسبوع</SelectItem>
              <SelectItem value="month">اخر شهر</SelectItem>
              <SelectItem value="threeMonths">اخر 3 شهور</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {cardsOrder.map((key, index) => {
            let content;
            switch (key) {
              case "total":
                content = (
                  <StatCard
                    icon={FileText}
                    label="عدد الخطط العلاجية"
                    value={stats.total}
                    isLoading={isLoading}
                    onClick={() => toggleStatFilter("total")}
                    active={activeStat === "total"}
                  />
                );
                break;
              case "usages":
                content = (
                  <StatCard
                    icon={Activity}
                    label="عدد استخدامات الخطط"
                    value={stats.usages}
                    isLoading={isLoading}
                    iconColorClass="bg-blue-500/10 text-blue-600"
                    onClick={() => toggleStatFilter("usages")}
                    active={activeStat === "usages"}
                  />
                );
                break;
              case "revenue":
                content = (
                  <StatCard
                    icon={Banknote}
                    label="إجمالي الدخل"
                    value={formatCurrency(stats.revenue)}
                    isLoading={isLoading}
                    iconColorClass="bg-green-500/10 text-green-600"
                    onClick={() => toggleStatFilter("revenue")}
                    active={activeStat === "revenue"}
                  />
                );
                break;
              case "avgPrice":
                content = (
                  <StatCard
                    icon={TrendingUp}
                    label="متوسط سعر الخطة"
                    value={formatCurrency(stats.avgPrice)}
                    isLoading={isLoading}
                    iconColorClass="bg-orange-500/10 text-orange-600"
                    onClick={() => toggleStatFilter("avgPrice")}
                    active={activeStat === "avgPrice"}
                  />
                );
                break;
              default:
                return null;
            }
            
            return (
              <SortableStat
                key={key}
                id={key}
                index={index}
                moveCard={moveCard}
                type="PLAN_STAT"
              >
                {content}
              </SortableStat>
            );
          })}
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="mb-4">
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 md:w-5 md:h-5" />
          <Input
            className="w-full pr-10 h-10 md:h-11 bg-background border-border focus:border-primary text-sm md:text-base"
            placeholder="دور على الخطة العلاجية بالاسم..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        
        {/* Action Buttons */}
        <div className="grid grid-cols-2 md:flex gap-2">
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="h-10 md:h-11 bg-primary hover:bg-primary/90 text-primary-foreground text-sm md:text-base col-span-2 md:col-span-1"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5 ml-2" />
            خطة علاجية جديدة
          </Button>
        </div>
      </div>

      {/* Plans List */}
      <Card className="bg-card/70 border-none shadow-none">
        <CardContent className="p-0">
          <TreatmentTemplatesList 
            templates={filteredTemplates} 
            isLoading={isLoading} 
            error={error} 
          />
        </CardContent>
      </Card>

      <TreatmentTemplateCreateDialog 
        open={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
      />
    </div>
  );
}