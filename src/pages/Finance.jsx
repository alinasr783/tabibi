import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
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
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">المالية</h1>
          <p className="text-muted-foreground">إدارة الإيرادات والمصروفات</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant={activeTab === "overview" ? "default" : "outline"}
            onClick={() => setActiveTab("overview")}
          >
            نظرة عامة
          </Button>
          <Button 
            variant={activeTab === "transactions" ? "default" : "outline"}
            onClick={() => setActiveTab("transactions")}
          >
            المعاملات
          </Button>
          <Button 
            variant={activeTab === "reports" ? "default" : "outline"}
            onClick={() => setActiveTab("reports")}
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