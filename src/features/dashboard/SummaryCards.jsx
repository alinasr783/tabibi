import {CalendarDays, Clock, Users, Wallet} from "lucide-react";
import {Card, CardContent} from "../../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {SkeletonLine} from "../../components/ui/skeleton";
import {formatCurrency} from "../../lib/utils";
import useDashboardStats from "./useDashboardStats";
import useFilteredPatientStats from "./useFilteredPatientStats";
import usePlan from "../auth/usePlan";
import useLastMonthBookings from "./useLastMonthBookings";
import { useNavigate } from "react-router-dom";

function Stat({icon: Icon, label, value, isLoading, onClick}) {
  return (
    <Card 
      className={`bg-card/70 ${onClick ? 'cursor-pointer hover:bg-accent/50 transition-colors' : ''}`}
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-3 py-3">
        <div className="size-8 rounded-[calc(var(--radius)-4px)] bg-primary/10 text-primary grid place-items-center">
          <Icon className="size-4" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          {isLoading ? (
            <SkeletonLine className="h-4 w-8" />
          ) : (
            <div className="text-lg font-semibold">{value}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SummaryCards({ filter, setFilter }) {
  const navigate = useNavigate();
  const {data: stats, isLoading} = useDashboardStats();
  const {data: planData} = usePlan();
  const {data: filteredStats, isLoading: isFilteredLoading} =
    useFilteredPatientStats(filter);
  const {count: lastMonthBookings, loading: isLastMonthBookingsLoading} = 
    useLastMonthBookings();

  // Check if income feature is enabled in the plan
  const isIncomeEnabled = planData?.plans?.limits?.features?.income !== false;

  const filterLabels = {
    week: "آخر أسبوع",
    month: "آخر شهر",
    threeMonths: "آخر 3 أشهر",
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards - Always shown except when specifically hidden */}
      <div
        className={`grid gap-3 ${
          isIncomeEnabled
            ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
            : "grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4"
        }`}>
        <Stat
          icon={CalendarDays}
          label="مواعيد اليوم"
          value={stats?.todayAppointments || 0}
          isLoading={isLoading}
          onClick={() => {
            // Scroll to today's appointments section
            const element = document.getElementById('today-appointments');
            if (element) {
              element.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }}
        />
        <Stat
          icon={Users}
          label="عدد المرضى الكلي"
          value={stats?.totalPatients || 0}
          isLoading={isLoading}
          onClick={() => navigate('/patients')}
        />
        <Stat
          icon={Users}
          label={`المرضى - ${filterLabels[filter]}`}
          value={filteredStats?.filteredPatients || 0}
          isLoading={isLoading || isFilteredLoading}
          onClick={() => navigate('/patients')}
        />
        <Stat
          icon={Clock}
          label="المواعيد المعلقة"
          value={stats?.pendingAppointments || 0}
          isLoading={isLoading}
        />
        <Stat
          icon={CalendarDays}
          label="لحجوزات الإلكترونية "
          value={lastMonthBookings || 0}
          isLoading={isLoading || isLastMonthBookingsLoading}
          onClick={() => navigate('/online-booking')}
        />
        {isIncomeEnabled && (
          <Stat
            icon={Wallet}
            label="إجمالي الدخل"
            value={
              stats?.totalIncome
                ? formatCurrency(stats.totalIncome)
                : "0.00 جنيه"
            }
            isLoading={isLoading}
            onClick={() => navigate('/finance')}
          />
        )}
      </div>
    </div>
  );
}