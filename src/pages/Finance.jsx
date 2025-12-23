import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { DollarSign } from "lucide-react";
import FinanceOverview from "../features/finance/FinanceOverview";
import FinanceTransactions from "../features/finance/FinanceTransactions";
import FinanceReports from "../features/finance/FinanceReports";
import { useLocation } from "react-router-dom";

export default function Finance() {
  const [activeTab, setActiveTab] = useState("overview");
  const location = useLocation();

  // Apply scroll to top on route changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="space-y-6 p-4 md:p-6 bg-background min-h-screen pb-20 md:pb-0" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">المالية</h1>
            <p className="text-sm text-muted-foreground">تحكم في الفلوس والمصروفات</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant={activeTab === "overview" ? "default" : "outline"}
            onClick={() => setActiveTab("overview")}
            className="h-9"
          >
            نظرة عامة
          </Button>
          <Button 
            variant={activeTab === "transactions" ? "default" : "outline"}
            onClick={() => setActiveTab("transactions")}
            className="h-9"
          >
            المعاملات
          </Button>
          <Button 
            variant={activeTab === "reports" ? "default" : "outline"}
            onClick={() => setActiveTab("reports")}
            className="h-9"
          >
            التقارير
          </Button>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === "overview" && <FinanceOverview />}
      {activeTab === "transactions" && <FinanceTransactions />}
      {activeTab === "reports" && <FinanceReports />}
    </div>
  );
}