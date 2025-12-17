import { Stethoscope } from "lucide-react";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import Activity from "./Activity";
import MiniSchedule from "./MiniSchedule";
import SubscriptionBanner from "./SubscriptionBanner";
import SummaryCards from "./SummaryCards";
import { useState } from "react";

export default function DashboardPage() {
  const [filter, setFilter] = useState("month");

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* Header Section - Responsive layout for mobile and desktop */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
              <Stethoscope className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold truncate">لوحة التحكم</h1>
              <p className="text-sm text-muted-foreground truncate">
                نظرة عامة سريعة على نشاط العيادة.
              </p>
            </div>
          </div>
          {/* Date filter - Full width on mobile, auto width on desktop - hidden on large screens */}
          <div className="w-full sm:w-auto lg:hidden">
            <SummaryCards filter={filter} setFilter={setFilter} />
          </div>
        </div>
      </div>

      {/* Stats Summary - Full width on large screens, hidden on mobile/small screens */}
      <div className="hidden lg:block w-full">
        <SummaryCards filter={filter} setFilter={setFilter} />
      </div>

      {/* New Sections: Mini Schedule & Subscription Banner - Responsive grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <MiniSchedule />
        <div className="h-fit">
          <SubscriptionBanner />
        </div>
      </div>

      {/* Recent Activity - Full Width */}
      <div className="grid gap-6">
        <Activity />
      </div>
    </div>
  );
}