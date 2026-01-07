import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Check, X, User, Calendar, Clock, Phone, Tag, MessageSquare, Eye, MoreHorizontal, CheckCircle, XCircle, Receipt } from "lucide-react";
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
import usePlan from "../auth/usePlan";

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
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: planData } = usePlan();
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

  const handleStatusChange = (appointmentId, newStatus) => {
    updateStatus({ id: appointmentId, status: newStatus });
  };

  const handleViewDetails = (appointmentId) => {
    navigate(`/appointments/${appointmentId}`);
  };

  // Check if WhatsApp feature is enabled in the plan
  const isWhatsAppEnabled = planData?.plans?.limits?.features?.whatsapp === true;

  const formatPhoneNumberForWhatsApp = (phone) => {
    if (!phone) return "";

    let formattedPhone = phone.replace(/\D/g, "");

    if (formattedPhone.startsWith("0")) {
      formattedPhone = "20" + formattedPhone.substring(1);
    }

    if (!formattedPhone.startsWith("20")) {
      formattedPhone = "20" + formattedPhone;
    }

    return formattedPhone;
  };

  const generateReminderMessage = (patientName, appointmentDate) => {
    const formattedDate = format(new Date(appointmentDate), "dd/MM/yyyy", {
      locale: ar,
    });
    const formattedTime = format(new Date(appointmentDate), "hh:mm a", {
      locale: ar,
    });

    return `مرحباً ${patientName}، هذا تذكير بموعدك في العيادة بتاريخ ${formattedDate} الساعة ${formattedTime}. نرجو الحضور قبل الموعد بـ15 دقيقة.`;
  };

  const handleSendReminder = (appointment) => {
    if (!isWhatsAppEnabled) {
      toast.error("ميزة الواتساب غير متوفرة في خطتك الحالية");
      return;
    }

    const formattedPhone = formatPhoneNumberForWhatsApp(appointment.patient?.phone);

    if (!formattedPhone) {
      toast.error("رقم الهاتف غير صحيح");
      return;
    }

    const message = generateReminderMessage(appointment.patient?.name, appointment.date);
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, "_blank");
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
  const OnlineBookingCard = ({ appointment }) => {
    const status = appointment.status?.toLowerCase() || 'pending';
    const statusInfo = statusMap[status] || statusMap.pending;
    const StatusIcon = statusInfo.icon || Clock;

    return (
      <div className="mb-4 pb-4 border-b border-border last:border-0 last:mb-0 last:pb-0">
        <div className="p-1">
          {/* Header - اسم المريض والحالة */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
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
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground h-10"
              size="sm"
            >
              <Eye className="w-4 h-4 ml-2" />
              شوف التفاصيل
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-3"
              onClick={() => handleSendReminder(appointment)}
              disabled={!isWhatsAppEnabled}
              title="ابعت تذكير واتساب"
            >
              <MessageSquare className="w-4 h-4" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 px-3">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => handleStatusChange(appointment.id, "confirmed")}>
                  <CheckCircle className="h-4 w-4 ml-2" />
                  قبول (مؤكد)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange(appointment.id, "rejected")}>
                  <XCircle className="h-4 w-4 ml-2" />
                  رفض
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange(appointment.id, "pending")}>
                  <Clock className="h-4 w-4 ml-2" />
                  قيد الانتظار
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange(appointment.id, "cancelled")}>
                  <XCircle className="h-4 w-4 ml-2" />
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