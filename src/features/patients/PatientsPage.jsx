import { Search, Plus, X, Users, Calendar } from "lucide-react";
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
  const navigate = useNavigate();

  const { data, isLoading, refetch } = usePatients(query, page);
  const { data: genderStats } = usePatientStats();

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
    <div className="space-y-6 p-4 md:p-6 bg-background min-h-screen pb-20 md:pb-0" dir="rtl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-[var(--radius)] bg-primary/10 text-primary">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">المرضى</h1>
            <p className="text-sm text-muted-foreground">{todaysPatients} مريض جديد اليوم</p>
          </div>
        </div>
        <Button
          onClick={() => setOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Plus className="w-4 h-4 ml-2" />
          مريض جديد
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

      {/* Search and Filters Bar */}
      <Card className="bg-card/70 border-0 shadow-none">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            {/* Search Input */}
            <div className="relative flex-1 w-full lg:w-auto">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                className="pr-10 h-11 text-base"
                placeholder="دور على المريض بالاسم، الموبايل أو ID"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              {(query) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-red-500 hover:text-red-700 hover:bg-red-50/50 gap-2"
                  onClick={handleResetFilters}
                >
                  <X className="h-4 w-4" />
                  امسح كله
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
  );
}
