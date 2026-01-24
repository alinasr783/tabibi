import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Check, X, User, Calendar, Clock, Phone, Tag, Eye, MoreHorizontal, CheckCircle, XCircle, Receipt } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import DataTable from "../../components/ui/table";
import { updateAppointment } from "../../services/apiAppointments";
import toast from "react-hot-toast";
import { cn } from "../../lib/utils";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const statusMap = {
  pending: { label: "جديد", variant: "warning", icon: Clock },
  confirmed: { label: "مؤكد", variant: "success", icon: CheckCircle },
  rejected: { label: "مرفوض", variant: "destructive", icon: XCircle },
  completed: { label: "مكتمل", variant: "default", icon: CheckCircle },
  cancelled: { label: "ملغي", variant: "destructive", icon: XCircle },
};

export default function OnlineBookingsTable({
  appointments,
  onAccept,
  onReject,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [selectedPhone, setSelectedPhone] = useState("");
  const [selectedPatientName, setSelectedPatientName] = useState("");

  const { mutate: updateStatus } = useMutation({
    mutationFn: ({ id, status }) => updateAppointment(id, { status }),
    // Optimistic update - immediately update the UI
    onMutate: async ({ id, status }) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ["appointments"] });
      
      // Snapshot the previous value
      const previousAppointments = queryClient.getQueryData(["appointments"]);
      
      // Optimistically update to the new value
      queryClient.setQueriesData({ queryKey: ["appointments"] }, old => {
        if (!old || !old.data) return old;
        
        // Update the specific appointment in the cache
        return {
          ...old,
          data: old.data.map(appointment => 
            appointment.id === id 
              ? { ...appointment, status } 
              : appointment
          )
        };
      });
      
      // Return a context object with the snapshotted value
      return { previousAppointments };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (err, variables, context) => {
      // Rollback to the previous value
      // Note: Rolling back setQueriesData is complex, usually we just invalidate
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.error(err.message || "فشل في تحديث حالة الحجز");
    },
    // Always refetch after error or success to ensure we have the correct data
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onSuccess: (_, variables) => {
      // Also invalidate dashboard stats to update the counts
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["filteredPatientStats"] });
      
      // Show success message with the updated status
      const statusLabel = statusMap[variables.status]?.label || variables.status;
      toast.success(`تم تغيير حالة الحجز إلى: ${statusLabel}`);
    },
  });

  const handleAccept = (appointmentId) => {
    updateStatus({ id: appointmentId, status: "confirmed" });
  };

  const handleReject = (appointmentId) => {
    updateStatus({ id: appointmentId, status: "rejected" });
  };

  const handleStatusChange = (appointmentId, newStatus) => {
    updateStatus({ id: appointmentId, status: newStatus });
  };

  const handleViewDetails = (appointmentId) => {
    navigate(`/appointments/${appointmentId}`);
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

  const columns = [
    {
      header: "اسم المريض",
      accessor: "patientName",
      cellClassName: "font-medium",
      render: (appointment) => (
        <Button 
          variant="link" 
          className="font-medium p-0 h-auto hover:text-primary"
          onClick={() => navigate(`/patients/${appointment.patient?.id}`)}>
          {appointment.patient?.name || "غير محدد"}
        </Button>
      ),
    },
    {
      header: "الحالة",
      accessor: "status",
      render: (appointment) => {
        const status = appointment.status?.toLowerCase() || 'pending';
        return (
          <Badge variant={statusMap[status]?.variant || "secondary"}>
            {statusMap[status]?.label || appointment.status}
          </Badge>
        );
      },
    },
    {
      header: "تاريخ الحجز",
      accessor: "date",
      cellClassName: "text-muted-foreground",
      render: (appointment) =>
        appointment.date
          ? format(new Date(appointment.date), "dd/MM/yyyy", {
              locale: ar,
            })
          : "غير محدد",
    },
    {
      header: "الوقت",
      accessor: "time",
      cellClassName: "text-muted-foreground",
      render: (appointment) =>
        appointment.date
          ? format(new Date(appointment.date), "hh:mm a", {
              locale: ar,
            })
          : "غير محدد",
    },
    {
      header: "رقم الهاتف",
      accessor: "patientPhone",
      cellClassName: "text-muted-foreground",
      render: (appointment) => (
        <Button 
          variant="link" 
          dir="ltr"
          className="text-sm p-0 h-auto hover:text-primary font-mono"
          onClick={() => handlePhoneClick(appointment.patient?.phone, appointment.patient?.name)}>
          {appointment.patient?.phone || "-"}
        </Button>
      ),
    },
    {
      header: "نوع الحجز",
      accessor: "notes",
      cellClassName: "text-muted-foreground",
    },
    {
      header: "",
    render: (appointment) => {
      const status = appointment.status?.toLowerCase() || 'pending';
      return (
        <div className="flex items-center gap-2">
          {status === "pending" && (
            <>
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
            </>
          )}
          
          {status === "confirmed" && (
            <Badge variant="success">مقبول</Badge>
          )}
          
          {status === "rejected" && (
            <Badge variant="destructive">مرفوض</Badge>
          )}
        </div>
      );
    },
  },
  ];

  // Mobile Card Component for Online Bookings
  const OnlineBookingCard = ({ appointment, className }) => {
    const status = appointment.status?.toLowerCase() || 'pending';
    const statusInfo = statusMap[status] || statusMap.pending;
    const StatusIcon = statusInfo.icon || Clock;

    return (
      <div className={cn("relative group h-full", className)} style={{direction: 'rtl'}}>
        <div className="flex flex-col h-full p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors shadow-sm">
          {/* Header - اسم المريض والحالة */}
          <div className="flex items-start justify-between mb-3" style={{direction: 'rtl'}}>
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <Button 
                  variant="link" 
                  className="font-bold text-base p-0 h-auto text-foreground hover:text-primary justify-start"
                  onClick={() => navigate(`/patients/${appointment.patient?.id}`)}>
                  <span className="truncate">{appointment.patient?.name || "غير محدد"}</span>
                </Button>
                <div className="flex items-center gap-2 mt-0.5">
                  <Button 
                    variant="link" 
                    className="flex items-center gap-1.5 text-muted-foreground text-xs p-0 h-auto hover:text-primary justify-start font-normal"
                    onClick={() => handlePhoneClick(appointment.patient?.phone, appointment.patient?.name)}>
                    <Phone className="w-3 h-3" />
                    <span className="truncate font-mono" dir="ltr">{appointment.patient?.phone || "-"}</span>
                  </Button>
                </div>
              </div>
            </div>
            <Badge variant={statusInfo.variant} className="gap-1.5 flex-shrink-0 px-2 py-1 h-7">
              <StatusIcon className="w-3.5 h-3.5" />
              {statusInfo.label}
            </Badge>
          </div>

          <div className="border-t border-border/50 my-3" />

          {/* معلومات الموعد */}
          <div className="grid grid-cols-2 gap-3 mb-4 flex-1">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="font-medium text-foreground">
                {appointment.date ? format(new Date(appointment.date), "dd/MM/yyyy", { locale: ar }) : "-"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="font-medium text-foreground">
                {appointment.date ? format(new Date(appointment.date), "hh:mm a", { locale: ar }) : "-"}
              </span>
            </div>
            {appointment.notes && (
              <div className="col-span-2 flex items-start gap-2 text-sm bg-muted/30 p-2 rounded border border-border/50 h-fit">
                <Tag className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground text-xs leading-relaxed line-clamp-2">{appointment.notes}</span>
              </div>
            )}
            
            <div className="col-span-2 flex items-center gap-2 text-sm mt-auto">
              <Receipt className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="font-medium text-foreground">
                السعر: <span className="font-bold text-primary">{appointment.price ? appointment.price.toFixed(2) : "0.00"}</span> جنيه
              </span>
            </div>
          </div>

          {/* الأزرار */}
          <div className="flex items-center gap-2 mt-auto pt-2 border-t border-border/50">
            <Button
              onClick={() => handleViewDetails(appointment.id)}
              className="flex-1 h-9 text-xs font-medium"
              variant="default"
              size="sm"
            >
              <Eye className="w-3.5 h-3.5 ml-2" />
              عرض التفاصيل
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 w-9 px-0">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48" dir="rtl">
                <DropdownMenuItem onClick={() => handleStatusChange(appointment.id, "confirmed")}>
                  <CheckCircle className="h-4 w-4 ml-2 text-green-600" />
                  قبول (مؤكد)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange(appointment.id, "rejected")}>
                  <XCircle className="h-4 w-4 ml-2 text-red-600" />
                  رفض
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange(appointment.id, "pending")}>
                  <Clock className="h-4 w-4 ml-2 text-yellow-600" />
                  قيد الانتظار
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange(appointment.id, "cancelled")}>
                  <XCircle className="h-4 w-4 ml-2 text-gray-600" />
                  ملغي
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Universal Grid View (Mobile & Desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-0">
        {appointments && appointments.length > 0 ? (
          appointments.map((appointment) => (
            <OnlineBookingCard key={appointment.id} appointment={appointment} />
          ))
        ) : (
          <div className="col-span-full text-center py-12 px-3 border-2 border-dashed rounded-lg bg-muted/10">
            <Calendar className="w-12 h-12 md:w-16 md:h-16 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-lg font-medium">مفيش حجوزات جديدة</p>
            <p className="text-muted-foreground/70 text-sm mt-1">الحجوزات الجديدة هتظهر هنا لما المرضى يحجزوا من خلال الرابط</p>
          </div>
        )}
      </div>

      {/* Load More Button */}
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
            معروض {appointments.length}
          </div>
        </div>
      )}

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