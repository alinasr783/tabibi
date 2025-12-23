import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { X, Filter, CheckCircle } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Switch } from "../../components/ui/switch";

export default function AppointmentsFilter({ onFilterChange }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Temporary filters (before applying)
  const [tempFilters, setTempFilters] = useState({
    status: "all",
    dateFrom: "",
    dateTo: "",
    source: "all",
    hasNotes: false,
  });
  
  // Applied filters (sent to parent)
  const [appliedFilters, setAppliedFilters] = useState({
    status: "all",
    dateFrom: "",
    dateTo: "",
    source: "all",
    hasNotes: false,
  });

  const handleTempFilterChange = (key, value) => {
    setTempFilters({ ...tempFilters, [key]: value });
  };
  
  const handleApplyFilters = () => {
    console.log('Applying filters:', tempFilters);
    setAppliedFilters(tempFilters);
    onFilterChange(tempFilters);
  };

  const handleReset = () => {
    const resetFilters = {
      status: "all",
      dateFrom: "",
      dateTo: "",
      source: "all",
      hasNotes: false,
    };
    setTempFilters(resetFilters);
    setAppliedFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  const activeFiltersCount = Object.entries(appliedFilters).filter(
    ([key, value]) => {
      if (key === 'status' || key === 'source') return value !== "all";
      return value !== "" && value !== false;
    }
  ).length;
  
  // Check if there are unapplied changes
  const hasUnappliedChanges = JSON.stringify(tempFilters) !== JSON.stringify(appliedFilters);

  return (
    <div className="space-y-3">
      {/* Mobile Filter Toggle */}
      <div className="md:hidden">
        <Button
          variant="outline"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full justify-between h-11"
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <span>فلاتر البحث</span>
            {activeFiltersCount > 0 && (
              <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </div>
          <span className="text-gray-400">{isExpanded ? "▲" : "▼"}</span>
        </Button>
      </div>

      {/* Filter Content */}
      <div className={`${!isExpanded ? 'hidden md:block' : ''}`}>
        <Card className="bg-card/70">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h3 className="text-lg font-semibold text-foreground">فلتر النتايج</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="h-9 text-red-500 hover:text-red-700 hover:bg-red-50/50"
                >
                  <X className="w-4 h-4 ml-1" />
                  امسح كله
                </Button>
                <Button
                  size="sm"
                  onClick={handleApplyFilters}
                  disabled={!hasUnappliedChanges}
                  className="h-9 bg-primary hover:bg-primary/90 disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4 ml-1" />
                  طبق الفلتر
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">حالة الموعد</Label>
                <Select
                  value={tempFilters.status}
                  onValueChange={(value) => handleTempFilterChange("status", value)}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="كل الحالات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الحالات</SelectItem>
                    <SelectItem value="pending">منتظر</SelectItem>
                    <SelectItem value="confirmed">مؤكد</SelectItem>
                    <SelectItem value="in_progress">بيتكشف دلوقتي</SelectItem>
                    <SelectItem value="completed">تم</SelectItem>
                    <SelectItem value="cancelled">ملغي</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Source Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">مصدر الحجز</Label>
                <Select
                  value={tempFilters.source}
                  onValueChange={(value) => handleTempFilterChange("source", value)}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="كل المصادر" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل المصادر</SelectItem>
                    <SelectItem value="clinic">من العيادة</SelectItem>
                    <SelectItem value="booking">من النت</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date From */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">من تاريخ</Label>
                <Input
                  type="date"
                  value={tempFilters.dateFrom}
                  onChange={(e) => handleTempFilterChange("dateFrom", e.target.value)}
                  className="h-11"
                />
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">إلى تاريخ</Label>
                <Input
                  type="date"
                  value={tempFilters.dateTo}
                  onChange={(e) => handleTempFilterChange("dateTo", e.target.value)}
                  className="h-11"
                />
              </div>
            </div>

            {/* Additional Filters */}
            <div className="mt-6 pt-6 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">مواعيد فيها ملاحظات</Label>
                  <p className="text-sm text-muted-foreground">بس اللي فيها ملاحظات</p>
                </div>
                <Switch
                  checked={tempFilters.hasNotes}
                  onCheckedChange={(checked) => handleTempFilterChange("hasNotes", checked)}
                />
              </div>
            </div>

            {/* Active Filters Summary */}
            {activeFiltersCount > 0 && (
              <div className="mt-6 pt-6 border-t border-border">
                <h4 className="text-sm font-medium text-foreground mb-3">الفلاتر المفعلة:</h4>
                <div className="flex flex-wrap gap-2">
                  {appliedFilters.status !== "all" && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs bg-blue-100 text-blue-700">
                      حالة: {appliedFilters.status === "pending" ? "منتظر" : 
                            appliedFilters.status === "confirmed" ? "مؤكد" : 
                            appliedFilters.status === "in_progress" ? "بيتكشف دلوقتي" :
                            appliedFilters.status === "completed" ? "تم" : "ملغي"}
                      <button
                        onClick={() => {
                          handleTempFilterChange("status", "all");
                          handleApplyFilters();
                        }}
                        className="text-blue-700 hover:text-blue-900"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {appliedFilters.source !== "all" && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs bg-green-100 text-green-700">
                      مصدر: {appliedFilters.source === "clinic" ? "من العيادة" : "من النت"}
                      <button
                        onClick={() => {
                          handleTempFilterChange("source", "all");
                          handleApplyFilters();
                        }}
                        className="text-green-700 hover:text-green-900"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {appliedFilters.dateFrom && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs bg-amber-100 text-amber-700">
                      من: {appliedFilters.dateFrom}
                      <button
                        onClick={() => {
                          handleTempFilterChange("dateFrom", "");
                          handleApplyFilters();
                        }}
                        className="text-amber-700 hover:text-amber-900"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {appliedFilters.dateTo && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs bg-amber-100 text-amber-700">
                      لحد: {appliedFilters.dateTo}
                      <button
                        onClick={() => {
                          handleTempFilterChange("dateTo", "");
                          handleApplyFilters();
                        }}
                        className="text-amber-700 hover:text-amber-900"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {appliedFilters.hasNotes && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs bg-purple-100 text-purple-700">
                      فيها ملاحظات
                      <button
                        onClick={() => {
                          handleTempFilterChange("hasNotes", false);
                          handleApplyFilters();
                        }}
                        className="text-purple-700 hover:text-purple-900"
                      >
                        ×
                      </button>
                    </span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}