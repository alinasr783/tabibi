import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Bell, Eye, MoreHorizontal, Clock, Calendar, Phone, MessageSquare, User, Receipt, Tag, Download, ChevronLeft, ChevronRight, CheckCircle, XCircle, AlertCircle } from "lucide-react";
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
import DataTable from "../../components/ui/table";
import { updateAppointment } from "../../services/apiAppointments";
import usePlan from "../auth/usePlan";

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
}) {
  const queryClient = useQueryClient();
  const { data: planData } = usePlan();

  const { mutate: updateStatus } = useMutation({
    mutationFn: ({ id, status }) => updateAppointment(id, { status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      const statusLabel = statusMap[variables.status]?.label || variables.status;
      toast.success(`تم تغيير حالة الحجز إلى: ${statusLabel}`);
    },
    onError: (err) => {
      toast.error(err.message || "فشل في تحديث حالة الحجز");
    },
  });

  const handleStatusChange = (appointmentId, newStatus) => {
    updateStatus({ id: appointmentId, status: newStatus });
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
            <div className="font-medium">{appointment.patient?.name || "غير محدد"}</div>
            <div className="text-xs text-gray-500">{appointment.patient?.phone || "-"}</div>
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
        const statusInfo = statusMap[appointment.status] || statusMap.pending;
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
            onClick={() => window.location.hash = `/appointments/${appointment.id}`}
            title="عرض تفاصيل الحجز"
          >
            <Eye className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-full"
            onClick={() => handleSendReminder(appointment)}
            title="إرسال تذكير عبر الواتساب"
            disabled={!isWhatsAppEnabled}
          >
            <Bell className="h-4 w-4" />
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
        <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">لا توجد مواعيد</h3>
        <p className="text-gray-500">لم يتم العثور على أي مواعيد تطابق البحث</p>
      </div>
    );
  }

  return (
    <div className={fullWidth ? "w-full" : ""}>
      <DataTable
        columns={columns}
        data={appointments}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={onPageChange}
        emptyLabel="لا توجد مواعيد"
      />
    </div>
  );
}
