import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Check, X, RefreshCw, Calendar, Clock, User, AlertCircle } from "lucide-react";
import useAppointments from "./useAppointments";
import TableSkeleton from "../../components/ui/table-skeleton";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateAppointment } from "../../services/apiAppointments";
import toast from "react-hot-toast";
import { ONLINE_BOOKINGS_PAGE_SIZE } from "../../constants/pagination";

const statusMap = {
  pending: { label: "جديد", variant: "warning" },
  confirmed: { label: "مؤكد", variant: "success" },
  rejected: { label: "مرفوض", variant: "destructive" },
  completed: { label: "مكتمل", variant: "default" },
  cancelled: { label: "ملغي", variant: "destructive" },
};

const sourceMap = {
  booking: { label: "من الموقع", variant: "default" },
  clinic: { label: "من العيادة", variant: "secondary" },
};

export default function OnlineBookingsSection() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  
  // Fetch only online bookings (from: booking) with pending/confirmed/rejected status
  const filters = { from: "booking" };
  const { 
    data: onlineBookingsData, 
    isLoading, 
    refetch 
  } = useAppointments("", page, ONLINE_BOOKINGS_PAGE_SIZE, filters);

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

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "dd MMMM yyyy - hh:mm a", { locale: ar });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Calendar className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">المواعيد الأونلاين</h2>
            <p className="text-sm text-gray-500">المواعيد القادمة من الموقع</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={refetch}
          className="h-9 gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          تحديث
        </Button>
      </div>

      {/* Info box for pending appointments */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
        <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-700">
          الحجوزات الجديدة (الحالة: جديد) تظهر في أعلى القائمة تلقائيًا لتسهيل الإجراءات السريعة
        </p>
      </div>

      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <TableSkeleton columns={4} rows={3} />
            </div>
          ) : onlineBookingsData?.items?.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {onlineBookingsData.items.map((appointment) => (
                <div key={appointment.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="font-medium truncate">{appointment.patient?.name || "غير محدد"}</span>
                        <Badge variant={sourceMap[appointment.from]?.variant || "secondary"}>
                          {sourceMap[appointment.from]?.label || appointment.from}
                        </Badge>
                        {appointment.status === "pending" && (
                          <Badge variant="warning">جديد</Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{formatDate(appointment.date)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-sm">الحالة:</span>
                        <Badge variant={statusMap[appointment.status]?.variant || "secondary"}>
                          {statusMap[appointment.status]?.label || appointment.status}
                        </Badge>
                      </div>
                    </div>
                    
                    {appointment.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1 border-green-300 text-green-700 hover:bg-green-50"
                          onClick={() => handleAccept(appointment.id)}
                        >
                          <Check className="w-4 h-4" />
                          قبول
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1 border-red-300 text-red-700 hover:bg-red-50"
                          onClick={() => handleReject(appointment.id)}
                        >
                          <X className="w-4 h-4" />
                          رفض
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {/* Pagination */}
              <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
                <div className="text-xs text-gray-500">
                  {Math.min((page - 1) * ONLINE_BOOKINGS_PAGE_SIZE + 1, onlineBookingsData.total)}–
                  {Math.min(page * ONLINE_BOOKINGS_PAGE_SIZE, onlineBookingsData.total)} من {onlineBookingsData.total}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}>
                    السابق
                  </Button>
                  <span className="px-3 py-1 rounded bg-gray-100 text-xs">
                    الصفحة {page}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page >= Math.ceil((onlineBookingsData.total || 0) / ONLINE_BOOKINGS_PAGE_SIZE)}
                    onClick={() => setPage(page + 1)}>
                    التالي
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 mb-2">لا توجد مواعيد أونلاين</p>
              <p className="text-sm text-gray-400">سيتم عرض المواعيد القادمة من الموقع هنا</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}