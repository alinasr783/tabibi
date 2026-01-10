import { Search, Plus, X, Users, Calendar, Filter, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import TableSkeleton from "../../components/ui/table-skeleton";
import { PAGE_SIZE } from "../../constants/pagination";
import PatientCreateDialog from "./PatientCreateDialog";
import PatientsTable from "./PatientsTable";
import usePatients from "./usePatients";
import usePatientStats from "./usePatientStats";
import useScrollToTop from "../../hooks/useScrollToTop";
import supabase from "../../services/supabase";

export default function PatientsPage() {
  useScrollToTop(); // Auto scroll to top on page load
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [clinicId, setClinicId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  const { data, isLoading, refetch } = usePatients(query, page);
  const { data: genderStats } = usePatientStats();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Get current user's clinic_id for patient creation
  useEffect(() => {
    const fetchClinicId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: userData } = await supabase
          .from("users")
          .select("clinic_id")
          .eq("user_id", session.user.id)
          .single();
        if (userData?.clinic_id) {
          setClinicId(userData.clinic_id);
        }
      }
    };
    fetchClinicId();
  }, []);

  // Calculate statistics
  const allPatients = data?.items || [];
  const totalPatients = data?.total || 0;
  
  const todaysPatients = allPatients.filter(p => {
    const today = new Date().toISOString().split('T')[0];
    return p.createdAt && p.createdAt.split('T')[0] === today;
  }).length;

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refetch]);

  const handlePatientCreated = (newPatient) => {
    // Navigate to the newly created patient's profile
    if (newPatient?.id) {
      console.log("Navigating to patient with ID:", newPatient.id, "Full patient object:", newPatient);
      navigate(`/patients/${newPatient.id}`);
    } else {
      console.error("No patient ID available for navigation", newPatient);
    }
  };

  // Filter patients based on status
  const filteredPatients = allPatients;

  const handleResetFilters = () => {
    setQuery("");
    setStatusFilter("all");
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 pb-20 md:pb-0" dir="rtl">
      <div className="max-w-[1920px] mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-[var(--radius)] bg-primary/10 text-primary">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">المرضى</h1>
              <p className="text-sm text-muted-foreground">{todaysPatients} مريض جديد اليوم</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="bg-card/70">
          <CardContent className="flex items-center gap-3 py-3">
            <div className="size-8 rounded-[calc(var(--radius)-4px)] bg-primary/10 text-primary grid place-items-center">
              <Users className="size-4" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">الإجمالي</div>
              <div className="text-lg font-semibold text-black">{totalPatients}</div>
          </div>
        </CardContent>
      </Card>
        
        <Card className="bg-card/70">
          <CardContent className="flex items-center gap-3 py-3">
            <div className="size-8 rounded-[calc(var(--radius)-4px)] bg-primary/10 text-primary grid place-items-center">
              <Calendar className="size-4" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">جديد اليوم</div>
              <div className="text-lg font-semibold text-black">{todaysPatients}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70">
          <CardContent className="flex items-center gap-3 py-3">
            <div className="size-8 rounded-[calc(var(--radius)-4px)] bg-blue-500/10 text-blue-600 grid place-items-center">
              <Users className="size-4" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">عدد المرضى الذكور</div>
              <div className="text-lg font-semibold text-black">{genderStats?.maleCount || 0}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70">
          <CardContent className="flex items-center gap-3 py-3">
            <div className="size-8 rounded-[calc(var(--radius)-4px)] bg-pink-500/10 text-pink-600 grid place-items-center">
              <Users className="size-4" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">عدد المرضى الاناث</div>
              <div className="text-lg font-semibold text-black">{genderStats?.femaleCount || 0}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Bar - Mobile Optimized */}
      <div className="mb-4">
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 md:w-5 md:h-5" />
          <Input
            className="w-full pr-10 h-10 md:h-11 bg-background border-border focus:border-primary text-sm md:text-base"
            placeholder="دور على المريض بالاسم، الموبايل أو ID"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
        
        {/* Action Buttons - Mobile Grid */}
        <div className="grid grid-cols-2 md:flex gap-2">
          <Button
            onClick={() => setOpen(true)}
            className="h-10 md:h-11 bg-primary hover:bg-primary/90 text-primary-foreground text-sm md:text-base col-span-2 md:col-span-1"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5 ml-2" />
            مريض جديد
          </Button>
        </div>
      </div>

      {/* Patients Table */}
      <Card className="bg-card/70">
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
      <PatientCreateDialog 
        open={open} 
        onClose={() => setOpen(false)} 
        onPatientCreated={handlePatientCreated}
        clinicId={clinicId}
      />
      </div>
    </div>
  );
}
