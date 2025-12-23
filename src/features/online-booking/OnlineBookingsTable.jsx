import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Check, X, User, Calendar, Clock, Phone, Tag, MessageSquare } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
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
  pending: { label: "جديد", variant: "warning" },
  confirmed: { label: "مؤكد", variant: "success" },
  rejected: { label: "مرفوض", variant: "destructive" },
  completed: { label: "مكتمل", variant: "default" },
  cancelled: { label: "ملغي", variant: "destructive" },
};

export default function OnlineBookingsTable({
  appointments,
  onAccept,
  onReject,
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
      queryClient.setQueryData(["appointments"], old => {
        if (!old) return old;
        
        // Update the specific appointment in the cache
        return {
          ...old,
          items: old.items?.map(appointment => 
            appointment.id === id 
              ? { ...appointment, status } 
              : appointment
          ) || []
        };
      });
      
      // Return a context object with the snapshotted value
      return { previousAppointments };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (err, variables, context) => {
      // Rollback to the previous value
      if (context?.previousAppointments) {
        queryClient.setQueryData(["appointments"], context.previousAppointments);
      }
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

  const handleWhatsApp = () => {
    const cleanPhone = selectedPhone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
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
      render: (appointment) => (
        <Badge variant={statusMap[appointment.status]?.variant || "secondary"}>
          {statusMap[appointment.status]?.label || appointment.status}
        </Badge>
      ),
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
          className="text-sm p-0 h-auto hover:text-primary"
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
      render: (appointment) => (
        <div className="flex items-center gap-2">
          {appointment.status === "pending" && (
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
          
          {appointment.status === "confirmed" && (
            <Badge variant="success">مقبول</Badge>
          )}
          
          {appointment.status === "rejected" && (
            <Badge variant="destructive">مرفوض</Badge>
          )}
        </div>
      ),
    },
  ];

  // Mobile Card Component for Online Bookings
  const OnlineBookingCard = ({ appointment }) => {
    const statusInfo = statusMap[appointment.status] || statusMap.pending;
    const isPending = appointment.status === "pending";
    const isConfirmed = appointment.status === "confirmed";
    const isRejected = appointment.status === "rejected";

    return (
      <Card className="mb-3 bg-card/70 hover:shadow-md transition-shadow">
        <CardContent className="p-3">
          {/* Header */}
          <div className="flex items-start justify-between mb-3 gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 text-green-600 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <Button 
                  variant="link" 
                  className="font-bold text-base p-0 h-auto hover:text-primary truncate w-full text-right"
                  onClick={() => navigate(`/patients/${appointment.patient?.id}`)}>
                  {appointment.patient?.name || "مش محدد"}
                </Button>
                <Button 
                  variant="link" 
                  className="flex items-center gap-1 text-muted-foreground text-xs p-0 h-auto hover:text-primary w-full"
                  onClick={() => handlePhoneClick(appointment.patient?.phone, appointment.patient?.name)}>
                  <Phone className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{appointment.patient?.phone || "-"}</span>
                </Button>
              </div>
            </div>
            <Badge variant={statusInfo.variant} className="flex-shrink-0 text-xs">
              {statusInfo.label}
            </Badge>
          </div>

          {/* معلومات الحجز */}
          <div className="space-y-2 mb-3 bg-accent/50 rounded-lg p-2.5">
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                <span className="font-medium text-foreground">
                  {appointment.date ? format(new Date(appointment.date), "dd/MM/yyyy", { locale: ar }) : "مش محدد"}
                </span>
              </div>
              <span className="text-muted-foreground">•</span>
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                <span className="font-medium text-foreground">
                  {appointment.date ? format(new Date(appointment.date), "hh:mm a", { locale: ar }) : "مش محدد"}
                </span>
              </div>
            </div>
            
            {appointment.notes && (
              <div className="flex items-start gap-1.5 text-xs">
                <Tag className="w-3.5 h-3.5 text-purple-600 flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground flex-1 break-words">{appointment.notes}</span>
              </div>
            )}
          </div>

          {/* الأزرار */}
          {isPending && (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => handleAccept(appointment.id)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white h-9 text-xs"
                size="sm"
              >
                <Check className="w-3.5 h-3.5 ml-1" />
                قبول
              </Button>
              <Button
                onClick={() => handleReject(appointment.id)}
                variant="outline"
                className="flex-1 border-red-300 text-red-700 hover:bg-red-50 h-9 text-xs"
                size="sm"
              >
                <X className="w-3.5 h-3.5 ml-1" />
                رفض
              </Button>
            </div>
          )}
          
          {isConfirmed && (
            <div className="text-center py-1.5">
              <Badge variant="success" className="text-xs px-3 py-1">تم القبول</Badge>
            </div>
          )}
          
          {isRejected && (
            <div className="text-center py-1.5">
              <Badge variant="destructive" className="text-xs px-3 py-1">تم الرفض</Badge>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      {/* Mobile View - Cards */}
      <div className="block md:hidden px-0">
        {appointments && appointments.length > 0 ? (
          appointments.map((appointment) => (
            <OnlineBookingCard key={appointment.id} appointment={appointment} />
          ))
        ) : (
          <div className="text-center py-8 px-3">
            <Calendar className="w-10 h-10 md:w-12 md:h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground text-sm">مفيش حجوزات جديدة</p>
          </div>
        )}
      </div>

      {/* Desktop View - Table */}
      <div className="hidden md:block">
        <DataTable
          columns={columns}
          data={appointments ?? []}
          emptyLabel="مفيش حجوزات جديدة"
        />
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

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleCall}
                className="h-20 flex-col gap-2 bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Phone className="w-6 h-6" />
                <span className="font-bold">مكالمة</span>
              </Button>
              
              <Button
                onClick={handleWhatsApp}
                className="h-20 flex-col gap-2 bg-green-500 hover:bg-green-600 text-white"
              >
                <MessageSquare className="w-6 h-6" />
                <span className="font-bold">واتساب</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}