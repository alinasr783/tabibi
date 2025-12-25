import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { DollarSign, TrendingUp } from "lucide-react";
import FinanceOverview from "../features/finance/FinanceOverview";
import FinanceTransactions from "../features/finance/FinanceTransactions";
import { useLocation } from "react-router-dom";

export default function Finance() {
  const [activeTab, setActiveTab] = useState("overview");
  const location = useLocation();

  // Apply scroll to top on route changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6 bg-background min-h-screen pb-20 md:pb-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 text-primary">
            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">المالية</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">تحكم في الفلوس والمصروفات</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={activeTab === "overview" ? "default" : "outline"}
            onClick={() => setActiveTab("overview")}
            className="h-8 sm:h-9 text-xs sm:text-sm flex-1 sm:flex-none"
          >
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" />
            نظرة عامة
          </Button>
          <Button 
            variant={activeTab === "transactions" ? "default" : "outline"}
            onClick={() => setActiveTab("transactions")}
            className="h-8 sm:h-9 text-xs sm:text-sm flex-1 sm:flex-none"
          >
            <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" />
            المعاملات
          </Button>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === "overview" && <FinanceOverview />}
      {activeTab === "transactions" && <FinanceTransactions />}
    </div>
  );
}