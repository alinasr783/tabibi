import { Search, Plus, X, Users, UserPlus, UserCheck, UserX, Calendar } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import TableSkeleton from "../../components/ui/table-skeleton";
import { PAGE_SIZE } from "../../constants/pagination";
import PatientCreateDialog from "./PatientCreateDialog";
import PatientsTable from "./PatientsTable";
import usePatients from "./usePatients";
import { useLocation } from "react-router-dom";

export default function PatientsPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const location = useLocation();
  
  // Apply scroll to top on route changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const { data, isLoading, refetch } = usePatients(query, page);

  // Calculate statistics
  const allPatients = data?.items || [];
  const totalPatients = data?.total || 0;
  const activePatients = allPatients.filter(p => p.status === "active").length;
  const newPatients = allPatients.filter(p => p.status === "new").length;
  const inactivePatients = allPatients.filter(p => p.status === "inactive").length;
  const todaysPatients = allPatients.filter(p => {
    const today = new Date().toISOString().split('T')[0];
    return p.createdAt && p.createdAt.split('T')[0] === today;
  }).length;

  // Filter patients based on status
  const filteredPatients = allPatients.filter(patient => {
    if (statusFilter === "all") return true;
    if (statusFilter === "active") return patient.status === "active";
    if (statusFilter === "new") return patient.status === "new";
    if (statusFilter === "inactive") return patient.status === "inactive";
    return true;
  });

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refetch]);

  const handleResetFilters = () => {
    setQuery("");
    setStatusFilter("all");
    setPage(1);
  };

  return (
    <div className="space-y-6 p-4 md:p-6 bg-gray-50 min-h-screen pb-20 md:pb-0" dir="rtl">
      {/* Header Section - Redesigned */}
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          {/* Left Side - Title and Info */}
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-white border border-gray-200 shadow-sm">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">إدارة المرضى</h1>
                <div className="flex flex-wrap items-center gap-4 text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">{new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    <span className="text-sm">{todaysPatients} مريض جديد اليوم</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Stats Overview */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">{totalPatients}</div>
                <div className="text-sm text-gray-500 flex items-center justify-center gap-1">
                  <Users className="w-4 h-4" />
                  الإجمالي
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 mb-1">{activePatients}</div>
                <div className="text-sm text-gray-500 flex items-center justify-center gap-1">
                  <UserCheck className="w-4 h-4" />
                  نشط
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 mb-1">{newPatients}</div>
                <div className="text-sm text-gray-500 flex items-center justify-center gap-1">
                  <UserPlus className="w-4 h-4" />
                  جديد
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600 mb-1">{inactivePatients}</div>
                <div className="text-sm text-gray-500 flex items-center justify-center gap-1">
                  <UserX className="w-4 h-4" />
                  غير نشط
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <Button
                  onClick={() => setOpen(true)}
                  className="w-full h-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-4 h-4 ml-2" />
                  مريض جديد
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                className="pr-10 h-11 text-base border-gray-300 focus:border-blue-500 bg-white"
                placeholder="ابحث باسم المريض، رقم الهاتف، أو الرقم المرجعي"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            
            {/* Status Filters */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                className="h-9"
                onClick={() => setStatusFilter("all")}
              >
                الكل
              </Button>
              <Button
                variant={statusFilter === "active" ? "default" : "outline"}
                size="sm"
                className="h-9 gap-2"
                onClick={() => setStatusFilter("active")}
              >
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                نشط
              </Button>
              <Button
                variant={statusFilter === "new" ? "default" : "outline"}
                size="sm"
                className="h-9 gap-2"
                onClick={() => setStatusFilter("new")}
              >
                <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                جديد
              </Button>
              <Button
                variant={statusFilter === "inactive" ? "default" : "outline"}
                size="sm"
                className="h-9 gap-2"
                onClick={() => setStatusFilter("inactive")}
              >
                <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                غير نشط
              </Button>
              
              {/* Reset Filters */}
              {(query || statusFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-red-600 hover:bg-red-50 gap-2"
                  onClick={handleResetFilters}
                >
                  <X className="h-4 w-4" />
                  إعادة تعيين
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patients Table */}
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton />
          ) : (
            <PatientsTable
              patients={filteredPatients}
              total={totalPatients}
              page={page}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>

      {/* Patient Create Dialog */}
      <PatientCreateDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}