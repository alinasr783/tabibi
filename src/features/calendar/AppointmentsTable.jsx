import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Bell, Eye, MoreHorizontal, Clock, Calendar, Phone, User, Receipt, Tag, Download, ChevronLeft, ChevronRight, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import DataTable from "../../components/ui/table";
import { updateAppointment } from "../../services/apiAppointments";
import usePlan from "../auth/usePlan";
import { useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";
import { useState } from "react";

const statusMap = {
  pending: { label: "قيد الانتظار", variant: "secondary", icon: Clock },
  confirmed: { label: "مؤكد", variant: "default", icon: CheckCircle },
  completed: { label: "مكتمل", variant: "outline", icon: CheckCircle },
  cancelled: { label: "ملغي", variant: "destructive", icon: XCircle },
};

export default function AppointmentsTable({
  appointments,
  total,
  page,
  pageSize,
  onPageChange,
  fullWidth = false,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  onAppointmentUpdated,
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [selectedPhone, setSelectedPhone] = useState("");
  const [selectedPatientName, setSelectedPatientName] = useState("");

  const { mutate: updateStatus } = useMutation({
    mutationFn: ({ id, status }) => updateAppointment(id, { status }),
    onMutate: async ({ id, status }) => {
      // Optimistic Update: تحديث الواجهة فوراً قبل استجابة السيرفر
      if (onAppointmentUpdated) {
        onAppointmentUpdated({ id, status });
      }
    },
    onSuccess: (data, variables) => {
      // تحديث البيانات في الكاش دون إعادة تحميل القائمة (للحفاظ على الترتيب)
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

      queryClient.invalidateQueries({ queryKey: ["appointment", variables.id] }); // تحديث صفحة التفاصيل
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      
      // تحديث القائمة بالبيانات المؤكدة من السيرفر
      if (onAppointmentUpdated) {
        onAppointmentUpdated(data);
      }

      const statusLabel = statusMap[variables.status]?.label || variables.status;
      toast.success(`تم تغيير حالة الحجز إلى: ${statusLabel}`);
    },
    onError: (err, variables, context) => {
      // في حالة الخطأ، نعيد تحميل البيانات الأصلية
      // queryClient.invalidateQueries({ queryKey: ["appointments"] });
      
      // Revert optimistic update if needed, but for now we just show error
      // Ideally we should rollback the cache update here
      
      toast.error(err.message || "فشل في تحديث حالة الحجز");
    },
  });

  const handleStatusChange = (appointmentId, newStatus) => {
    updateStatus({ id: appointmentId, status: newStatus });
  };

  const handlePhoneClick = (phone, patientName) => {
    if (!phone) return;
    setSelectedPhone(phone);
    setSelectedPatientName(patientName || "مريض");
    setShowContactDialog(true);
  };

  const handleCall = () => {
    window.location.href = `tel:${selectedPhone}`;
    setShowContactDialog(false);
  };

  const handleViewDetails = (appointmentId) => {
    navigate(`/appointments/${appointmentId}`);
  };

  const columns = [
    {
      header: "المريض",
      accessor: "patientName",
      cellClassName: "font-medium",
      render: (appointment) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <Button 
              variant="link" 
              className="font-medium p-0 h-auto text-left hover:text-primary"
              onClick={() => navigate(`/patients/${appointment.patient?.id}`)}>
              {appointment.patient?.name || "غير محدد"}
            </Button>
            <Button 
              variant="link" 
              className="flex items-center gap-1 text-xs text-gray-500 p-0 h-auto hover:text-primary"
              onClick={() => handlePhoneClick(appointment.patient?.phone, appointment.patient?.name)}>
              {appointment.patient?.phone || "-"}
            </Button>
          </div>
        </div>
      ),
    },
    {
      header: "التاريخ والوقت",
      accessor: "date",
      cellClassName: "text-muted-foreground",
      render: (appointment) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-medium">
              {appointment.date ? format(new Date(appointment.date), "dd/MM/yyyy", { locale: ar }) : "غير محدد"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span>
              {appointment.date ? format(new Date(appointment.date), "hh:mm a", { locale: ar }) : "غير محدد"}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: "نوع الحجز",
      accessor: "notes",
      cellClassName: "text-muted-foreground",
      render: (appointment) => (
        <div className="flex items-center gap-2">
          <Tag className="w-3.5 h-3.5 text-gray-400" />
          <span className="max-w-[120px] truncate">{appointment.notes}</span>
        </div>
      ),
    },
    {
      header: "السعر",
      accessor: "price",
      cellClassName: "text-muted-foreground",
      render: (appointment) => (
        <div className="flex items-center gap-2 font-medium">
          <Receipt className="w-3.5 h-3.5 text-gray-400" />
          <span>{appointment.price ? appointment.price.toFixed(2) : "0.00"} ج.م</span>
        </div>
      ),
    },
    {
      header: "الحالة",
      accessor: "status",
      render: (appointment) => {
        const status = appointment.status?.toLowerCase() || 'pending';
        const statusInfo = statusMap[status] || statusMap.pending;
        const StatusIcon = statusInfo.icon;
        return (
          <Badge variant={statusInfo.variant} className="gap-1.5">
            <StatusIcon className="w-3.5 h-3.5" />
            {statusInfo.label}
          </Badge>
        );
      },
    },
    {
      header: "",
      render: (appointment) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-full"
            onClick={() => handleViewDetails(appointment.id)}
            title="عرض تفاصيل الحجز"
          >
            <Eye className="h-4 w-4" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 rounded-full">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => handleStatusChange(appointment.id, "pending")}>
                <Clock className="h-4 w-4 ml-2" />
                قيد الانتظار
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange(appointment.id, "confirmed")}>
                <CheckCircle className="h-4 w-4 ml-2" />
                مؤكد
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange(appointment.id, "completed")}>
                <CheckCircle className="h-4 w-4 ml-2" />
                مكتمل
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange(appointment.id, "cancelled")}>
                <XCircle className="h-4 w-4 ml-2" />
                ملغي
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  if (!appointments || appointments.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-1">مفيش مواعيد</h3>
        <p className="text-muted-foreground">ملقيناش أي مواعيد تطابق البحث</p>
      </div>
    );
  }

  // Pagination Component
  const MobilePagination = () => {
    if (!total || total <= pageSize) return null;
    
    const totalPages = Math.ceil(total / pageSize);
    const canGoBack = page > 1;
    const canGoForward = page < totalPages;

    return (
      <div className="flex items-center justify-between mt-4 px-2 bg-card/50 rounded-[var(--radius)] p-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={!canGoBack}
          className="h-9 px-3"
        >
          <ChevronRight className="w-4 h-4 ml-1" />
          السابق
        </Button>
        
        <div className="text-sm text-muted-foreground">
          صفحة <span className="font-bold text-foreground">{page}</span> من <span className="font-bold text-foreground">{totalPages}</span>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={!canGoForward}
          className="h-9 px-3"
        >
          التالي
          <ChevronLeft className="w-4 h-4 mr-1" />
        </Button>
      </div>
    );
  };

  return (
    <>
      {/* Mobile View - Cards */}
      <div className="block md:hidden pt-2">
        {appointments.map((appointment) => (
          <AppointmentCard 
            key={appointment.id} 
            appointment={appointment}
            statusMap={statusMap}
            navigate={navigate}
            handlePhoneClick={handlePhoneClick}
            handleViewDetails={handleViewDetails}
            handleStatusChange={handleStatusChange}
          />
        ))}
        
        {onLoadMore ? (
          hasMore && (
            <div className="mt-4 px-2 pb-4">
              <Button 
                variant="outline" 
                className="w-full h-11 text-base"
                onClick={onLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                   "بيحمل..."
                ) : (
                   "عرض المزيد"
                )}
              </Button>
            </div>
          )
        ) : (
          <MobilePagination />
        )}
      </div>

      {/* Desktop View - Table */}
      <div className={cn("hidden md:block", fullWidth ? "w-full" : "")}>
        <DataTable
          columns={columns}
          data={appointments}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={onLoadMore ? undefined : onPageChange}
          emptyLabel="مفيش مواعيد"
        />
        
        {onLoadMore && hasMore && (
           <div className="mt-4 flex flex-col items-center justify-center border-t pt-4">
              <Button 
                variant="outline" 
                onClick={onLoadMore}
                disabled={isLoadingMore}
                className="min-w-[200px]"
              >
                {isLoadingMore ? "بيحمل..." : "عرض المزيد"}
              </Button>
              <div className="text-xs text-muted-foreground mt-2">
                 معروض {appointments.length} من {total}
              </div>
           </div>
        )}
      </div>

      {/* Contact Method Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold">
              اتصل بـ {selectedPatientName}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-3">
                <Phone className="w-8 h-8 text-primary" />
              </div>
              <p className="text-lg font-bold text-foreground">{selectedPhone}</p>
              <p className="text-sm text-muted-foreground mt-1">اختار طريقة الاتصال</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <Button
                onClick={handleCall}
                className="h-20 flex-col gap-2 bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Phone className="w-6 h-6" />
                <span className="font-bold">مكالمة</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Extracted Component
const AppointmentCard = ({ 
  appointment, 
  statusMap, 
  navigate, 
  handlePhoneClick, 
  handleViewDetails, 
  handleStatusChange 
}) => {
  const status = appointment.status?.toLowerCase() || 'pending';
  const statusInfo = statusMap[status] || statusMap.pending;
  const StatusIcon = statusInfo.icon;

  return (
    <div className="mb-4 pb-4 border-b border-border last:border-0 last:mb-0 last:pb-0">
      <div className="p-1">
        {/* Header - اسم المريض والحالة */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-12 h-12 rounded-[var(--radius)] bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <Button 
                variant="link" 
                className="font-bold text-lg p-0 h-auto text-right hover:text-primary"
                onClick={() => navigate(`/patients/${appointment.patient?.id}`)}>
                {appointment.patient?.name || "مش محدد"}
              </Button>
              <Button 
                variant="link" 
                className="flex items-center gap-1.5 text-muted-foreground text-sm p-0 h-auto hover:text-primary"
                onClick={() => handlePhoneClick(appointment.patient?.phone, appointment.patient?.name)}>
                <span className="truncate">{appointment.patient?.phone || "-"}</span>
              </Button>
            </div>
          </div>
          <Badge variant={statusInfo.variant} className="gap-1.5 flex-shrink-0">
            <StatusIcon className="w-3.5 h-3.5" />
            {statusInfo.label}
          </Badge>
        </div>

        {/* معلومات الموعد */}
        <div className="space-y-2.5 mb-4 p-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="font-medium text-foreground">
              {appointment.date ? format(new Date(appointment.date), "dd/MM/yyyy", { locale: ar }) : "مش محدد"}
            </span>
            <span className="text-muted-foreground">•</span>
            <Clock className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="font-medium text-foreground">
              {appointment.date ? format(new Date(appointment.date), "hh:mm a", { locale: ar }) : "مش محدد"}
            </span>
          </div>
          
          {appointment.notes && (
            <div className="flex items-start gap-2 text-sm">
              <Tag className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
              <span className="text-muted-foreground flex-1">{appointment.notes}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-sm">
            <Receipt className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span className="font-bold text-foreground">
              {appointment.price ? appointment.price.toFixed(2) : "0.00"} جنيه
            </span>
          </div>
        </div>

        {/* الأزرار */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => handleViewDetails(appointment.id)}
            className="w-[75%] bg-primary hover:bg-primary/90 text-primary-foreground h-10"
            size="sm"
          >
            <Eye className="w-4 h-4 ml-2" />
            شوف التفاصيل
          </Button>
          
          <div className="w-[25%]">
            <Select 
              value={status} 
              onValueChange={(val) => handleStatusChange(appointment.id, val)}
            >
              <SelectTrigger className="w-full h-10 px-1 justify-center text-xs bg-background">
                 <div className="truncate">
                  {statusMap[status]?.label || "الحالة"}
                 </div>
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="pending">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>قيد الانتظار</span>
                  </div>
                </SelectItem>
                <SelectItem value="confirmed">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    <span>مؤكد</span>
                  </div>
                </SelectItem>
                <SelectItem value="completed">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    <span>مكتمل</span>
                  </div>
                </SelectItem>
                <SelectItem value="cancelled">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    <span>ملغي</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
};
