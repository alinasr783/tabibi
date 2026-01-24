import { Search, Plus, Users, Calendar, Filter, RefreshCw, ChevronDown } from "lucide-react";
  // Import useMemo
import { useState, useEffect, useCallback, useMemo } from "react";
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
import PatientCreateDialog from "./PatientCreateDialog";
import PatientsTable from "./PatientsTable";
import usePatients from "./usePatients";
import usePatientStats from "./usePatientStats";
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

export default function PatientsPage() {
  useScrollToTop(); // Auto scroll to top on page load
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [clinicId, setClinicId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Stats filtering
  const [statsFilter, setStatsFilter] = useState("month"); // Default to last month as per common UX, user asked for options
  const [genderFilter, setGenderFilter] = useState(null);
  const [dateFilter, setDateFilter] = useState(null);

  const navigate = useNavigate();

  // Calculate dates - Memoized to prevent infinite re-fetching loops due to changing milliseconds
  const { weekStart, monthStart, threeMonthsStart } = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const threeMonthsStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    return { weekStart, monthStart, threeMonthsStart };
  }, []);

  const filterStartDate = statsFilter === "week" ? weekStart : statsFilter === "month" ? monthStart : threeMonthsStart;

  // Memoize filters to prevent unnecessary refetches
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filters = useMemo(() => ({ gender: genderFilter, createdAfter: dateFilter }), [genderFilter, dateFilter]);

  // Handle filter toggles
  const toggleGenderFilter = (gender) => {
    if (genderFilter === gender) {
      setGenderFilter(null);
    } else {
      setGenderFilter(gender);
      setDateFilter(null); // Clear date filter when gender is selected to avoid confusion, or keep it? User said "like any state". Usually states are mutually exclusive or additive. Let's keep them mutually exclusive for simplicity as "States".
    }
  };

  const toggleDateFilter = () => {
    if (dateFilter) {
      setDateFilter(null);
    } else {
      setDateFilter(filterStartDate);
      setGenderFilter(null); // Clear gender filter
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
  } = usePatients(query, filters, 20);

  // Stats for subtitle (always weekly new)
  const { data: weeklyStats } = usePatientStats(weekStart);
  
  // Stats for cards (filtered)
  const { data: filteredStats, isLoading: statsLoading, isError: statsError } = usePatientStats(filterStartDate);
  
  const defaultOrder = ["total", "newToday", "male", "female"];

  const [cardsOrder, setCardsOrder] = useState(() => {
    try {
      const saved = localStorage.getItem("patients_stats_order");
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
    localStorage.setItem("patients_stats_order", JSON.stringify(cardsOrder));
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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Get current user's clinic_id for patient creation
  useEffect(() => {
    const fetchClinicId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: userData } = await supabase
          .from("users")
          .select("clinic_id")
          .eq("user_id", session.user.id)
          .single();
        if (userData?.clinic_id) {
          setClinicId(userData.clinic_id);
        }
      }
    };
    fetchClinicId();
  }, []);

  // Flatten patients data from infinite query
  const allPatients = data?.pages.flatMap(page => page.items) || [];
  const totalPatients = data?.pages[0]?.total || 0;
  
  // Weekly new patients count for subtitle
  const weeklyNewCount = weeklyStats?.totalCount || 0;

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refetch]);

  const handlePatientCreated = (newPatient) => {
    // Navigate to the newly created patient's profile
    if (newPatient?.id) {
      console.log("Navigating to patient with ID:", newPatient.id, "Full patient object:", newPatient);
      navigate(`/patients/${newPatient.id}`);
    } else {
      console.error("No patient ID available for navigation", newPatient);
    }
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const filterLabels = {
    week: "اخر اسبوع",
    month: "اخر شهر",
    threeMonths: "اخر 3 شهور",
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 space-y-6" dir="rtl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-[var(--radius)] bg-primary/10 text-primary">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">إدارة المرضى</h1>
            <p className="text-sm text-muted-foreground">{weeklyNewCount} مريض جديد الاسبوع ده</p>
          </div>
        </div>
      </div>

      {/* Stats Filter & Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            احصائيات مرضاك
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
                    icon={Users}
                    label="الإجمالي"
                    value={totalPatients} // This always shows total patients in DB matching search/gender filter
                    isLoading={isLoading && !isError}
                    onClick={() => { setGenderFilter(null); setDateFilter(null); }}
                    // No active state for total card as requested
                    active={false}
                  />
                );
                break;
              case "newToday":
                // Renaming "New Today" to reflect the filter
                content = (
                  <StatCard
                    icon={Calendar}
                    label="جديد"
                    value={filteredStats?.totalCount || 0}
                    isLoading={statsLoading && !statsError}
                    onClick={toggleDateFilter}
                    active={!!dateFilter}
                  />
                );
                break;
              case "male":
                content = (
                  <StatCard
                    icon={Users}
                    label="عدد المرضى الذكور"
                    value={filteredStats?.maleCount || 0}
                    isLoading={statsLoading && !statsError}
                    iconColorClass="bg-blue-500/10 text-blue-600"
                    onClick={() => toggleGenderFilter("male")}
                    active={genderFilter === "male"}
                  />
                );
                break;
              case "female":
                content = (
                  <StatCard
                    icon={Users}
                    label="عدد المرضى الاناث"
                    value={filteredStats?.femaleCount || 0}
                    isLoading={statsLoading && !statsError}
                    iconColorClass="bg-pink-500/10 text-pink-600"
                    onClick={() => toggleGenderFilter("female")}
                    active={genderFilter === "female"}
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
                type="PATIENT_STAT"
              >
                {content}
              </SortableStat>
            );
          })}
        </div>
      </div>

      {/* Quick Actions Bar - Mobile Optimized */}
      <div className="mb-4">
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 md:w-5 md:h-5" />
          <Input
            className="w-full pr-10 h-10 md:h-11 bg-background border-border focus:border-primary text-sm md:text-base"
            placeholder="دور على المريض بالاسم، الموبايل أو ID"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
          />
        </div>
        
        {/* Action Buttons - Mobile Grid */}
        <div className="grid grid-cols-2 md:flex gap-2">
          <Button
            onClick={() => setOpen(true)}
            className="h-10 md:h-11 bg-primary hover:bg-primary/90 text-primary-foreground text-sm md:text-base col-span-2 md:col-span-1"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5 ml-2" />
            مريض جديد
          </Button>
        </div>
      </div>

      {/* Patients Table */}
      <Card className="bg-card/70 border-none shadow-none">
        <CardContent className="p-0">
          {isLoading && !isFetchingNextPage && allPatients.length === 0 ? (
            <TableSkeleton />
          ) : (
            <PatientsTable
              patients={allPatients}
              total={totalPatients}
              page={1} // Not used for pagination display anymore
              pageSize={20}
              onPageChange={() => {}} // Not used
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

      {/* Patient Create Dialog */}
      <PatientCreateDialog 
        open={open} 
        onClose={() => setOpen(false)} 
        onPatientCreated={handlePatientCreated}
        clinicId={clinicId}
      />
    </div>
  );
}
