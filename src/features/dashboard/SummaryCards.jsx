import { CalendarDays, Clock, Users, Wallet } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { SkeletonLine } from "../../components/ui/skeleton";
import { formatCurrency } from "../../lib/utils";
import useDashboardStats from "./useDashboardStats";
import useFilteredPatientStats from "./useFilteredPatientStats";
import usePlan from "../auth/usePlan";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import SortableStat from "../../components/ui/sortable-stat";

function Stat({ icon: Icon, label, value, isLoading, onClick }) {
  return (
    <Card
      className={`bg-card/70 h-full ${
        onClick ? "cursor-pointer hover:bg-accent/50 transition-colors" : ""
      }`}
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-3 py-3">
        <div className="size-8 rounded-[calc(var(--radius)-4px)] bg-primary/10 text-primary grid place-items-center flex-shrink-0">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground truncate">{label}</div>
          {isLoading ? (
            <SkeletonLine className="h-4 w-8" />
          ) : (
            <div className="text-lg font-semibold truncate">{value}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}



export default function SummaryCards({ filter, setFilter }) {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useDashboardStats();
  const { data: planData } = usePlan();
  const { data: filteredStats, isLoading: isFilteredLoading } =
    useFilteredPatientStats(filter);

  // Check if income feature is enabled in the plan
  const isIncomeEnabled = planData?.plans?.limits?.features?.income !== false;

  const filterLabels = {
    week: "آخر أسبوع",
    month: "آخر شهر",
    threeMonths: "آخر 3 أشهر",
  };

  const defaultOrder = [
    "today",
    "total_patients",
    "filtered_patients",
    "pending",
    "online",
    "income",
  ];

  // Load order from local storage or use default
  const [cardsOrder, setCardsOrder] = useState(() => {
    try {
      const saved = localStorage.getItem("dashboard_stats_order");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validate that parsed is an array and contains valid keys
        if (Array.isArray(parsed)) {
            // Merge with default to ensure any new keys are added
            const uniqueKeys = new Set([...parsed, ...defaultOrder]);
            return Array.from(uniqueKeys);
        }
      }
    } catch (e) {
      console.error("Failed to load stats order", e);
    }
    return defaultOrder;
  });

  // Save order to local storage whenever it changes
  useEffect(() => {
    localStorage.setItem("dashboard_stats_order", JSON.stringify(cardsOrder));
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

  const cardDefinitions = {
    today: {
      id: "today",
      icon: CalendarDays,
      label: "مواعيد اليوم",
      value: stats?.todayAppointments || 0,
      isLoading: isLoading,
      onClick: () => {
        const element = document.getElementById("today-appointments");
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      },
    },
    total_patients: {
      id: "total_patients",
      icon: Users,
      label: "عدد المرضى الكلي",
      value: stats?.totalPatients || 0,
      isLoading: isLoading,
      onClick: () => navigate("/patients"),
    },
    filtered_patients: {
      id: "filtered_patients",
      icon: Users,
      label: `المرضى - ${filterLabels[filter]}`,
      value: filteredStats?.filteredPatients || 0,
      isLoading: isFilteredLoading,
      onClick: () => navigate("/patients"),
    },
    pending: {
      id: "pending",
      icon: Clock,
      label: `المواعيد المعلقة - ${filterLabels[filter]}`,
      value: filteredStats?.filteredPendingAppointments || 0,
      isLoading: isFilteredLoading,
    },
    online: {
      id: "online",
      icon: CalendarDays,
      label: `الحجوزات الإلكترونية - ${filterLabels[filter]}`,
      value: filteredStats?.filteredOnlineAppointments || 0,
      isLoading: isFilteredLoading,
      onClick: () => navigate("/online-booking"),
    },
    income: {
      id: "income",
      icon: Wallet,
      label: `إجمالي الدخل - ${filterLabels[filter]}`,
      value: filteredStats?.filteredTotalIncome
        ? formatCurrency(filteredStats.filteredTotalIncome)
        : "0.00 جنيه",
      isLoading: isFilteredLoading,
      hidden: !isIncomeEnabled,
    },
  };

  return (
    <div className="space-y-4">
      {/* Filter Selector */}
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm font-medium text-muted-foreground">
          احصائيات العيادة
        </h3>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="اختر الفترة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">آخر أسبوع</SelectItem>
            <SelectItem value="month">آخر شهر</SelectItem>
            <SelectItem value="threeMonths">آخر 3 أشهر</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards - Always shown except when specifically hidden */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        {cardsOrder.map((key, index) => {
          const card = cardDefinitions[key];
          if (!card || card.hidden) return null;

          return (
            <SortableStat
              key={card.id}
              id={card.id}
              index={index}
              moveCard={moveCard}
            >
              <Stat
                icon={card.icon}
                label={card.label}
                value={card.value}
                isLoading={card.isLoading}
                onClick={card.onClick}
              />
            </SortableStat>
          );
        })}
      </div>
    </div>
  );
}
