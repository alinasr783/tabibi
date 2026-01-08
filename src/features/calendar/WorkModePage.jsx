import { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Clock, User, RefreshCw, ArrowLeft, Check, X, AlertCircle, Eye, Calendar as CalendarIcon, Phone } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import useAppointments from "./useAppointments";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateAppointment } from "../../services/apiAppointments";
import toast from "react-hot-toast";
import TableSkeleton from "../../components/ui/table-skeleton";

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

export default function WorkModePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch all appointments (including online bookings)
  const { 
    data: appointmentsData, 
    isLoading, 
    refetch 
  } = useAppointments("", 1, 1000);

  const { mutate: updateStatus } = useMutation({
    mutationFn: ({ id, status }) => updateAppointment(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
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

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30 * 1000);
    return () => clearInterval(interval);
  }, [refetch]);

  // Filter appointments to show only pending, confirmed, and in_progress for today from all sources
  const today = new Date().toISOString().split('T')[0];
  const filteredAppointments = appointmentsData?.items?.filter(appointment => 
    (appointment.status === "pending" || appointment.status === "confirmed" || appointment.status === "in_progress") &&
    appointment.date &&
    appointment.date.startsWith(today)
  ) || [];

  // Sort appointments by date (earliest first)
  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    return new Date(a.date) - new Date(b.date);
  });

  // Calculate patient age from birth date if available (fallback)
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

  return (
    <div className="min-h-screen bg-background p-4 md:p-6" dir="rtl">
      <div className="max-w-[1920px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">وضع العمل</h1>
                  <p className="text-sm text-muted-foreground">ترتيب دخول المرضى</p>
                </div>
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
        </div>

        {/* Info Box */}
        <div className="mb-6">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-blue-700 font-medium">وضع العمل</p>
              <p className="text-sm text-blue-600">
                بتعرض الصفحة دي كل الحجوزات المؤكدة، الجديدة، واللي بتتكشف دلوقتي لليوم دا بترتيب زمني. 
                تقدر تقبل أو ترفض الحجوزات الجديدة من هنا.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-card/70">
              <CardContent className="flex items-center gap-3 py-3">
                <div className="size-8 rounded-[calc(var(--radius)-4px)] bg-primary/10 text-primary grid place-items-center">
                  <User className="size-4" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">إجمالي الحجوزات</div>
                  <div className="text-lg font-semibold">{sortedAppointments.length}</div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-card/70">
              <CardContent className="flex items-center gap-3 py-3">
                <div className="size-8 rounded-[calc(var(--radius)-4px)] bg-amber-500/10 text-amber-600 grid place-items-center">
                  <Clock className="size-4" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">جديدة</div>
                  <div className="text-lg font-semibold text-amber-600">
                    {sortedAppointments.filter(a => a.status === "pending").length}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-card/70">
              <CardContent className="flex items-center gap-3 py-3">
                <div className="size-8 rounded-[calc(var(--radius)-4px)] bg-green-500/10 text-green-600 grid place-items-center">
                  <Check className="size-4" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">مؤكدة</div>
                  <div className="text-lg font-semibold text-green-600">
                    {sortedAppointments.filter(a => a.status === "confirmed").length}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-card/70">
              <CardContent className="flex items-center gap-3 py-3">
                <div className="size-8 rounded-[calc(var(--radius)-4px)] bg-purple-500/10 text-purple-600 grid place-items-center">
                  <Clock className="size-4" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">بيتكشف دلوقتي</div>
                  <div className="text-lg font-semibold text-purple-600">
                    {sortedAppointments.filter(a => a.status === "in_progress").length}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Appointments List */}
        <Card className="bg-card/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              قائمة المرضى
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="p-6">
                <TableSkeleton columns={5} rows={5} />
              </div>
            ) : sortedAppointments.length > 0 ? (
              <>
                {/* Mobile Cards */}
                <div className="block md:hidden space-y-3">
                  {sortedAppointments.map((appointment, index) => (
                    <Card key={appointment.id} className="bg-card/70 hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 rounded-[var(--radius)] bg-primary/10 text-primary flex items-center justify-center font-bold">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-foreground text-lg truncate">
                                {appointment.patient?.name || "مريض"}
                              </h3>
                              <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                                <Phone className="w-3.5 h-3.5" />
                                <span className="truncate">{appointment.patient?.phone || "-"}</span>
                              </div>
                            </div>
                          </div>
                          <Badge variant={statusMap[appointment.status]?.variant || "secondary"}>
                            {statusMap[appointment.status]?.label || appointment.status}
                          </Badge>
                        </div>

                        <div className="space-y-2 mb-4 bg-accent/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-sm">
                            <CalendarIcon className="w-4 h-4 text-primary" />
                            <span className="font-medium text-foreground">
                              {appointment.date ? format(new Date(appointment.date), "dd/MM/yyyy hh:mm a", { locale: ar }) : "-"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-purple-600" />
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

                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleViewDetails(appointment.id)}
                            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground h-10"
                            size="sm"
                          >
                            <Eye className="w-4 h-4 ml-2" />
                            شوف التفاصيل
                          </Button>
                          {appointment.status === "pending" && (
                            <>
                              <Button
                                onClick={() => handleAccept(appointment.id)}
                                variant="outline"
                                className="h-10 px-3 border-green-300 text-green-700 hover:bg-green-50"
                                size="sm"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                onClick={() => handleReject(appointment.id)}
                                variant="outline"
                                className="h-10 px-3 border-red-300 text-red-700 hover:bg-red-50"
                                size="sm"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-right py-3 px-4 font-medium text-foreground">#</th>
                        <th className="text-right py-3 px-4 font-medium text-foreground">اسم المريض</th>
                        <th className="text-right py-3 px-4 font-medium text-foreground">رقم الهاتف</th>
                        <th className="text-right py-3 px-4 font-medium text-foreground">العمر</th>
                        <th className="text-right py-3 px-4 font-medium text-foreground">نوع الحجز</th>
                        <th className="text-right py-3 px-4 font-medium text-foreground">تاريخ الحجز</th>
                        <th className="text-right py-3 px-4 font-medium text-foreground">ميعاد الدخول</th>
                        <th className="text-right py-3 px-4 font-medium text-foreground">الحالة</th>
                        <th className="text-right py-3 px-4 font-medium text-foreground">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedAppointments.map((appointment, index) => (
                        <tr key={appointment.id} className="border-b border-border/50 hover:bg-accent/50">
                          <td className="py-3 px-4">{index + 1}</td>
                          <td className="py-3 px-4 font-medium">{appointment.patient?.name || "مريض"}</td>
                          <td className="py-3 px-4">{appointment.patient?.phone || "-"}</td>
                          <td className="py-3 px-4">
                            {appointment.age || 
                             (appointment.patient?.age || calculateAge(appointment.patient?.date_of_birth)) || 
                             "-"}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={sourceMap[appointment.from]?.variant || "secondary"}>
                              {sourceMap[appointment.from]?.label || appointment.from}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            {appointment.created_at
                              ? format(new Date(appointment.created_at), "dd/MM/yyyy hh:mm a", { locale: ar })
                              : "-"}
                          </td>
                          <td className="py-3 px-4">
                            {appointment.date
                              ? format(new Date(appointment.date), "dd/MM/yyyy hh:mm a", { locale: ar })
                              : "-"}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={statusMap[appointment.status]?.variant || "secondary"}>
                              {statusMap[appointment.status]?.label || appointment.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1"
                                onClick={() => handleViewDetails(appointment.id)}
                              >
                                <Eye className="h-4 w-4" />
                                عرض
                              </Button>
                              
                              {appointment.status === "pending" && (
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 gap-1 border-green-300 text-green-700 hover:bg-green-50"
                                    onClick={() => handleAccept(appointment.id)}
                                  >
                                    <Check className="h-4 w-4" />
                                    قبول
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 gap-1 border-red-300 text-red-700 hover:bg-red-50"
                                    onClick={() => handleReject(appointment.id)}
                                  >
                                    <X className="h-4 w-4" />
                                    رفض
                                  </Button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-foreground mb-2">مفيش مواعيد اليوم</p>
                <p className="text-sm text-muted-foreground">هتظهر المواعيد هنا لما تيجي</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}