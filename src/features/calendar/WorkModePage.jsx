import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Clock, User, RefreshCw, Check, X, Eye, Calendar as CalendarIcon, Phone, Search } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { ar } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import useAppointments from "./useAppointments";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateAppointment } from "../../services/apiAppointments";
import toast from "react-hot-toast";
import TableSkeleton from "../../components/ui/table-skeleton";
import SortableStat from "../../components/ui/sortable-stat";
import { Input } from "../../components/ui/input";
import DataTable from "../../components/ui/table";
import supabase from "../../services/supabase";
import { SkeletonLine } from "../../components/ui/skeleton";

const statusMap = {
  pending: { label: "جديد", variant: "warning" },
  confirmed: { label: "مؤكد", variant: "success" },
  in_progress: { label: "بيتكشف دلوقتي", variant: "info" },
  rejected: { label: "مرفوض", variant: "destructive" },
  completed: { label: "مكتمل", variant: "default" },
  cancelled: { label: "ملغي", variant: "destructive" },
};

const sourceMap = {
  booking: { label: "إلكتروني", variant: "default" },
  clinic: { label: "من العيادة", variant: "secondary" },
};

function StatCard({ icon: Icon, label, value, isLoading, iconColorClass = "bg-primary/10 text-primary", onClick, active }) {
  return (
    <Card 
      className={`bg-card/70 h-full transition-all duration-200 ${onClick ? 'cursor-pointer hover:bg-accent/50' : ''} ${active ? 'ring-2 ring-primary border-primary' : ''}`}
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-3 py-3">
        <div className={`size-8 rounded-[calc(var(--radius)-4px)] grid place-items-center ${iconColorClass}`}>
          <Icon className="size-4" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          {isLoading ? (
            <SkeletonLine className="h-4 w-8" />
          ) : (
            <div className={`text-lg font-semibold ${active ? 'text-primary' : 'text-foreground'}`}>{value}</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function WorkModePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState(null);
  const [query, setQuery] = useState("");
  const [weeklyNewCount, setWeeklyNewCount] = useState(0);

  // Fetch appointments for today
  const dateFilter = useMemo(() => ({ date: new Date() }), [new Date().toDateString()]);
  
  const { 
    data: appointmentsData, 
    isLoading, 
    refetch 
  } = useAppointments("", 1, 1000, dateFilter);

  const defaultOrder = ["total", "new", "confirmed", "inProgress"];

  const [cardsOrder, setCardsOrder] = useState(() => {
    try {
      const saved = localStorage.getItem("workmode_stats_order");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const uniqueKeys = new Set([...parsed, ...defaultOrder]);
          return Array.from(uniqueKeys);
        }
      }
    } catch (e) {
      console.error("Failed to load stats order", e);
    }
    return defaultOrder;
  });

  useEffect(() => {
    localStorage.setItem("workmode_stats_order", JSON.stringify(cardsOrder));
  }, [cardsOrder]);

  // Fetch weekly new appointments count
  useEffect(() => {
    const fetchWeeklyCount = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        const { data: userData } = await supabase
          .from("users")
          .select("clinic_id")
          .eq("user_id", session.user.id)
          .single();
          
        if (!userData?.clinic_id) return;

        const now = new Date();
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const { count } = await supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("clinic_id", userData.clinic_id)
          .gte("created_at", weekStart);
          
        setWeeklyNewCount(count || 0);
      } catch (error) {
        console.error("Error fetching weekly count:", error);
      }
    };
    
    fetchWeeklyCount();
  }, []);

  const moveCard = useCallback((dragIndex, hoverIndex) => {
    setCardsOrder((prevCards) => {
      const newCards = [...prevCards];
      const draggedCard = newCards[dragIndex];
      newCards.splice(dragIndex, 1);
      newCards.splice(hoverIndex, 0, draggedCard);
      return newCards;
    });
  }, []);

  const { mutate: updateStatus } = useMutation({
    mutationFn: ({ id, status }) => updateAppointment(id, { status }),
    onSuccess: (data, variables) => {
      queryClient.setQueriesData({ queryKey: ["appointments"] }, (oldData) => {
        if (!oldData || !oldData.data) return oldData;
        return {
          ...oldData,
          data: oldData.data.map((item) =>
            item.id === variables.id
              ? { ...item, status: variables.status }
              : item
          ),
        };
      });
      toast.success("تم تحديث حالة الحجز بنجاح");
    },
    onError: (error) => {
      toast.error(error.message || "فشل في تحديث حالة الحجز");
    },
  });

  const handleAccept = (appointmentId) => {
    updateStatus({ id: appointmentId, status: "confirmed" });
  };

  const handleReject = (appointmentId) => {
    updateStatus({ id: appointmentId, status: "rejected" });
  };

  const handleViewDetails = (appointmentId) => {
    navigate(`/appointments/${appointmentId}`);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 500);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30 * 1000);
    return () => clearInterval(interval);
  }, [refetch]);

  // Filter logic
  const filteredAppointments = useMemo(() => {
    if (!appointmentsData?.data) return [];
    
    return appointmentsData.data.filter(appointment => {
      // Base filter: only pending, confirmed, in_progress for today
      const isValidStatus = (appointment.status === "pending" || appointment.status === "confirmed" || appointment.status === "in_progress");
      const isToday = appointment.date && isSameDay(new Date(appointment.date), new Date());
      
      if (!isValidStatus || !isToday) return false;

      // Status filter
      if (statusFilter && appointment.status !== statusFilter) return false;

      // Search query
      if (query) {
        const searchLower = query.toLowerCase();
        const patientName = appointment.patient?.name?.toLowerCase() || "";
        const patientPhone = appointment.patient?.phone?.toLowerCase() || "";
        return patientName.includes(searchLower) || patientPhone.includes(searchLower);
      }

      return true;
    });
  }, [appointmentsData, statusFilter, query]);

  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    return new Date(a.date) - new Date(b.date);
  });

  const calculateAge = (birthDate) => {
    if (!birthDate) return "غير محدد";
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Base counts for cards (ignoring filters for the counts themselves, except "Today" constraint)
  const baseAppointments = useMemo(() => {
    if (!appointmentsData?.data) return [];
    return appointmentsData.data.filter(appointment => 
      (appointment.status === "pending" || appointment.status === "confirmed" || appointment.status === "in_progress") &&
      appointment.date &&
      isSameDay(new Date(appointment.date), new Date())
    );
  }, [appointmentsData]);

  const columns = [
    {
      header: "#",
      accessor: (row, index) => index + 1,
    },
    {
      header: "اسم المريض",
      accessor: "patient.name",
      render: (row) => <span className="font-medium">{row.patient?.name || "مريض"}</span>
    },
    {
      header: "رقم الهاتف",
      accessor: "patient.phone",
      render: (row) => row.patient?.phone || "-"
    },
    {
      header: "العمر",
      accessor: "age",
      render: (row) => row.age || (row.patient?.age || calculateAge(row.patient?.date_of_birth)) || "-"
    },
    {
      header: "نوع الحجز",
      accessor: "from",
      render: (row) => (
        <Badge variant={sourceMap[row.from]?.variant || "secondary"}>
          {sourceMap[row.from]?.label || row.from}
        </Badge>
      )
    },
    {
      header: "تاريخ الحجز",
      accessor: "created_at",
      render: (row) => row.created_at ? format(new Date(row.created_at), "dd/MM/yyyy hh:mm a", { locale: ar }) : "-"
    },
    {
      header: "ميعاد الدخول",
      accessor: "date",
      render: (row) => row.date ? format(new Date(row.date), "dd/MM/yyyy hh:mm a", { locale: ar }) : "-"
    },
    {
      header: "الحالة",
      accessor: "status",
      render: (row) => (
        <Badge variant={statusMap[row.status]?.variant || "secondary"}>
          {statusMap[row.status]?.label || row.status}
        </Badge>
      )
    },
    {
      header: "إجراءات",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1"
            onClick={() => handleViewDetails(row.id)}
          >
            <Eye className="h-4 w-4" />
            عرض
          </Button>
          
          {row.status === "pending" && (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1 border-green-300 text-green-700 hover:bg-green-50"
                onClick={() => handleAccept(row.id)}
              >
                <Check className="h-4 w-4" />
                قبول
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1 border-red-300 text-red-700 hover:bg-red-50"
                onClick={() => handleReject(row.id)}
              >
                <X className="h-4 w-4" />
                رفض
              </Button>
            </div>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-[var(--radius)] bg-primary/10 text-primary">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">وضع العمل</h1>
            <p className="text-sm text-muted-foreground">{weeklyNewCount} معاد جديد الاسبوع ده</p>
          </div>
        </div>
        
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
          className="h-10 gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cardsOrder.map((key, index) => {
          let content;
          switch (key) {
            case "total":
              content = (
                <StatCard
                  icon={User}
                  label="إجمالي الحجوزات"
                  value={baseAppointments.length}
                  isLoading={isLoading}
                  onClick={() => setStatusFilter(null)}
                  active={false}
                />
              );
              break;
            case "new":
              content = (
                <StatCard
                  icon={Clock}
                  label="جديدة"
                  value={baseAppointments.filter(a => a.status === "pending").length}
                  isLoading={isLoading}
                  iconColorClass="bg-amber-500/10 text-amber-600"
                  onClick={() => setStatusFilter(prev => prev === "pending" ? null : "pending")}
                  active={statusFilter === "pending"}
                />
              );
              break;
            case "confirmed":
              content = (
                <StatCard
                  icon={Check}
                  label="مؤكدة"
                  value={baseAppointments.filter(a => a.status === "confirmed").length}
                  isLoading={isLoading}
                  iconColorClass="bg-green-500/10 text-green-600"
                  onClick={() => setStatusFilter(prev => prev === "confirmed" ? null : "confirmed")}
                  active={statusFilter === "confirmed"}
                />
              );
              break;
            case "inProgress":
              content = (
                <StatCard
                  icon={Clock}
                  label="بيتكشف دلوقتي"
                  value={baseAppointments.filter(a => a.status === "in_progress").length}
                  isLoading={isLoading}
                  iconColorClass="bg-purple-500/10 text-purple-600"
                  onClick={() => setStatusFilter(prev => prev === "in_progress" ? null : "in_progress")}
                  active={statusFilter === "in_progress"}
                />
              );
              break;
            default:
              return null;
          }
          
          return (
            <SortableStat
              key={key}
              id={key}
              index={index}
              moveCard={moveCard}
              type="WORKMODE_STAT"
            >
              {content}
            </SortableStat>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 md:w-5 md:h-5" />
        <Input
          className="w-full pr-10 h-10 md:h-11 bg-background border-border focus:border-primary text-sm md:text-base"
          placeholder="دور على المريض بالاسم أو رقم الهاتف"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Appointments List */}
      <Card className="bg-card/70 border-none shadow-none">
        <CardContent className="p-0">
          {isLoading ? (
             <TableSkeleton columns={5} rows={5} />
          ) : sortedAppointments.length > 0 ? (
            <>
              {/* Mobile Cards */}
              <div className="block md:hidden space-y-3">
                {sortedAppointments.map((appointment, index) => (
                  <Card key={appointment.id} className="bg-card/70 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-12 h-12 rounded-[var(--radius)] bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-foreground text-lg truncate">
                              {appointment.patient?.name || "مريض"}
                            </h3>
                            <Badge variant={statusMap[appointment.status]?.variant || "secondary"}>
                              {statusMap[appointment.status]?.label || appointment.status}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4 bg-muted/30 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-primary" />
                          <span className="font-medium text-foreground">
                            {appointment.patient?.phone || "-"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <CalendarIcon className="w-4 h-4 text-purple-600" />
                          <span className="text-muted-foreground">
                            {appointment.date ? format(new Date(appointment.date), "hh:mm a", { locale: ar }) : "-"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-blue-500" />
                          <span className="text-muted-foreground">
                            العمر: {appointment.age || appointment.patient?.age || calculateAge(appointment.patient?.date_of_birth) || "-"}
                          </span>
                        </div>
                        <div>
                          <Badge variant={sourceMap[appointment.from]?.variant || "secondary"}>
                            {sourceMap[appointment.from]?.label || appointment.from}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Button
                          onClick={() => handleViewDetails(appointment.id)}
                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-10"
                        >
                          <Eye className="w-4 h-4 ml-2" />
                          شوف التفاصيل
                        </Button>
                        
                        {appointment.status === "pending" && (
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleAccept(appointment.id)}
                              variant="outline"
                              className="flex-1 h-10 border-green-300 text-green-700 hover:bg-green-50"
                            >
                              <Check className="w-4 h-4 ml-2" />
                              قبول
                            </Button>
                            <Button
                              onClick={() => handleReject(appointment.id)}
                              variant="outline"
                              className="flex-1 h-10 border-red-300 text-red-700 hover:bg-red-50"
                            >
                              <X className="w-4 h-4 ml-2" />
                              رفض
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block">
                <DataTable
                  columns={columns}
                  data={sortedAppointments}
                  emptyLabel="لا توجد حجوزات"
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Clock className="w-12 h-12 mb-4 opacity-20" />
              <p>لا توجد حجوزات مطابقة</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
