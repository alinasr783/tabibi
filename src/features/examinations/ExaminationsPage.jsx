import { useState, useMemo, useEffect, useCallback } from "react";
import { Search, Plus, Stethoscope, Calendar, Filter, RefreshCw, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import TableSkeleton from "../../components/ui/table-skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import GlobalVisitCreateDialog from "./GlobalVisitCreateDialog";
import ExaminationsTable from "./ExaminationsTable";
import { useVisits } from "./useVisits";
import useVisitStats from "./useVisitStats";
import useScrollToTop from "../../hooks/useScrollToTop";
import supabase from "../../services/supabase";
import SortableStat from "../../components/ui/sortable-stat";
import { SkeletonLine } from "../../components/ui/skeleton";

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

export default function ExaminationsPage() {
  useScrollToTop();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Stats filtering
  const [statsFilter, setStatsFilter] = useState("month");
  const [genderFilter, setGenderFilter] = useState(null);
  const [dateFilter, setDateFilter] = useState(null);

  const navigate = useNavigate();

  // Calculate dates
  const { weekStart, monthStart, threeMonthsStart } = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const threeMonthsStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    return { weekStart, monthStart, threeMonthsStart };
  }, []);

  const filterStartDate = statsFilter === "week" ? weekStart : statsFilter === "month" ? monthStart : threeMonthsStart;

  // Memoize filters
  const filters = useMemo(() => ({ gender: genderFilter, createdAfter: dateFilter }), [genderFilter, dateFilter]);

  const toggleGenderFilter = (gender) => {
    if (genderFilter === gender) {
      setGenderFilter(null);
    } else {
      setGenderFilter(gender);
      setDateFilter(null);
    }
  };

  const toggleDateFilter = () => {
    if (dateFilter) {
      setDateFilter(null);
    } else {
      setDateFilter(filterStartDate);
      setGenderFilter(null);
    }
  };

  // Data fetching
  const { 
    data, 
    isLoading, 
    isError,
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage,
    refetch 
  } = useVisits(query, filters, 15);

  // Stats
  const { data: stats, isLoading: statsLoading } = useVisitStats();
  
  const defaultOrder = ["total", "today", "week", "month"];

  const [cardsOrder, setCardsOrder] = useState(() => {
    try {
      const saved = localStorage.getItem("visits_stats_order_v2");
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
    localStorage.setItem("visits_stats_order_v2", JSON.stringify(cardsOrder));
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

  const allVisits = data?.pages.flatMap(page => page.items) || [];
  const totalVisits = data?.pages[0]?.total || 0;
  
  const weeklyNewCount = stats?.week || 0;

  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refetch]);

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 space-y-6" dir="rtl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-[var(--radius)] bg-primary/10 text-primary">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">إدارة الكشوفات</h1>
            <p className="text-sm text-muted-foreground">{weeklyNewCount} كشف جديد الاسبوع ده</p>
          </div>
        </div>
      </div>

      {/* Stats Filter & Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            احصائيات كشوفاتك
          </h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {cardsOrder.map((key, index) => {
            let content;
            switch (key) {
              case "total":
                content = (
                  <StatCard
                    icon={Stethoscope}
                    label="إجمالي الكشوفات"
                    value={stats?.total || 0} 
                    isLoading={statsLoading}
                    active={false}
                  />
                );
                break;
              case "today":
                content = (
                  <StatCard
                    icon={Calendar}
                    label="كشوفات اليوم"
                    value={stats?.today || 0}
                    isLoading={statsLoading}
                    iconColorClass="bg-green-500/10 text-green-600"
                    active={false}
                  />
                );
                break;
              case "week":
                content = (
                  <StatCard
                    icon={Users}
                    label="كشوفات الاسبوع"
                    value={stats?.week || 0}
                    isLoading={statsLoading}
                    iconColorClass="bg-blue-500/10 text-blue-600"
                    active={false}
                  />
                );
                break;
              case "month":
                content = (
                  <StatCard
                    icon={Users}
                    label="كشوفات الشهر"
                    value={stats?.month || 0}
                    isLoading={statsLoading}
                    iconColorClass="bg-purple-500/10 text-purple-600"
                    active={false}
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
                type="VISIT_STAT"
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
            placeholder="دور على الكشف باسم المريض أو الموبايل"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
          />
        </div>
        
        {/* Action Buttons */}
        <div className="grid grid-cols-2 md:flex gap-2">
          <Button
            onClick={() => setOpen(true)}
            className="h-10 md:h-11 bg-primary hover:bg-primary/90 text-primary-foreground text-sm md:text-base col-span-2 md:col-span-1"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5 ml-2" />
            كشف جديد
          </Button>
        </div>
      </div>

      {/* Visits Table */}
      <Card className="bg-card/70 border-none shadow-none">
        <CardContent className="p-0">
          {isLoading && !isFetchingNextPage && allVisits.length === 0 ? (
            <TableSkeleton />
          ) : (
            <ExaminationsTable
              visits={allVisits}
              total={totalVisits}
              page={1}
              pageSize={15}
              onPageChange={() => {}}
              onLoadMore={handleLoadMore}
              hasMore={hasNextPage}
            />
          )}
          {isFetchingNextPage && (
             <div className="p-4 flex justify-center">
               <SkeletonLine className="h-8 w-32" />
             </div>
          )}
        </CardContent>
      </Card>

      <GlobalVisitCreateDialog 
        open={open} 
        onOpenChange={setOpen} 
      />
    </div>
  );
}
