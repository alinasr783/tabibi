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
import { X, Filter } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Switch } from "../../components/ui/switch";

export default function AppointmentsFilter({ onFilterChange }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState({
    status: "",
    dateFrom: "",
    dateTo: "",
    source: "",
    hasNotes: false,
  });

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleReset = () => {
    const resetFilters = {
      status: "",
      dateFrom: "",
      dateTo: "",
      source: "",
      hasNotes: false,
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  const activeFiltersCount = Object.values(filters).filter(
    value => value !== "" && value !== false
  ).length;

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
        <Card className="border-gray-200">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900">تصفية النتائج</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="h-9 text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="w-4 h-4 ml-1" />
                  مسح الكل
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">حالة الموعد</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => handleFilterChange("status", value)}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="كل الحالات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">كل الحالات</SelectItem>
                    <SelectItem value="pending">قيد الانتظار</SelectItem>
                    <SelectItem value="confirmed">مؤكد</SelectItem>
                    <SelectItem value="completed">مكتمل</SelectItem>
                    <SelectItem value="cancelled">ملغي</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Source Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">مصدر الحجز</Label>
                <Select
                  value={filters.source}
                  onValueChange={(value) => handleFilterChange("source", value)}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="كل المصادر" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">كل المصادر</SelectItem>
                    <SelectItem value="clinic">من العيادة</SelectItem>
                    <SelectItem value="booking">من الموقع</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date From */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">من تاريخ</Label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                  className="h-11"
                />
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">إلى تاريخ</Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                  className="h-11"
                />
              </div>
            </div>

            {/* Additional Filters */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">مواعيد تحتوي على ملاحظات</Label>
                  <p className="text-sm text-gray-500">عرض المواعيد التي تحتوي على ملاحظات فقط</p>
                </div>
                <Switch
                  checked={filters.hasNotes}
                  onCheckedChange={(checked) => handleFilterChange("hasNotes", checked)}
                />
              </div>
            </div>

            {/* Active Filters Summary */}
            {activeFiltersCount > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">الفلاتر المطبقة:</h4>
                <div className="flex flex-wrap gap-2">
                  {filters.status && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs bg-blue-100 text-blue-700">
                      حالة: {filters.status === "pending" ? "قيد الانتظار" : 
                            filters.status === "confirmed" ? "مؤكد" : 
                            filters.status === "completed" ? "مكتمل" : "ملغي"}
                      <button
                        onClick={() => handleFilterChange("status", "")}
                        className="text-blue-700 hover:text-blue-900"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filters.source && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs bg-green-100 text-green-700">
                      مصدر: {filters.source === "clinic" ? "من العيادة" : "من الموقع"}
                      <button
                        onClick={() => handleFilterChange("source", "")}
                        className="text-green-700 hover:text-green-900"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filters.dateFrom && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs bg-amber-100 text-amber-700">
                      من: {filters.dateFrom}
                      <button
                        onClick={() => handleFilterChange("dateFrom", "")}
                        className="text-amber-700 hover:text-amber-900"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filters.dateTo && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs bg-amber-100 text-amber-700">
                      إلى: {filters.dateTo}
                      <button
                        onClick={() => handleFilterChange("dateTo", "")}
                        className="text-amber-700 hover:text-amber-900"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filters.hasNotes && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs bg-purple-100 text-purple-700">
                      بها ملاحظات
                      <button
                        onClick={() => handleFilterChange("hasNotes", false)}
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