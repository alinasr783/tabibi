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

function Stat({icon: Icon, label, value, isLoading}) {
  return (
    <Card className="bg-card/70">
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
  const {data: stats, isLoading} = useDashboardStats();
  const {data: planData} = usePlan();
  const {data: filteredStats, isLoading: isFilteredLoading} =
    useFilteredPatientStats(filter);

  // Check if income feature is enabled in the plan
  const isIncomeEnabled = planData?.plans?.limits?.features?.income !== false;

  const filterLabels = {
    week: "آخر أسبوع",
    month: "آخر شهر",
    threeMonths: "آخر 3 أشهر",
  };

  return (
    <div className="space-y-4">
      {/* Filter Section - Only shown when SummaryCards is used in mobile layout */}
      <div className="w-full lg:hidden">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="h-8 text-sm w-full">
            <SelectValue placeholder="اختر فترة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">آخر أسبوع</SelectItem>
            <SelectItem value="month">آخر شهر</SelectItem>
            <SelectItem value="threeMonths">آخر 3 أشهر</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
        />
        <Stat
          icon={Users}
          label="عدد المرضى الكلي"
          value={stats?.totalPatients || 0}
          isLoading={isLoading}
        />
        <Stat
          icon={Users}
          label={`المرضى - ${filterLabels[filter]}`}
          value={filteredStats?.filteredPatients || 0}
          isLoading={isLoading || isFilteredLoading}
        />
        <Stat
          icon={Clock}
          label="المواعيد المعلقة"
          value={stats?.pendingAppointments || 0}
          isLoading={isLoading}
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
          />
        )}
      </div>
    </div>
  );
}