import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Bell, Eye, MoreHorizontal, Clock, CalendarDays, Phone, MessageSquare, User, Calendar, Receipt, Tag, Download, Filter, ChevronLeft, ChevronRight, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ChevronDown, Smartphone } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../../components/ui/sheet";
import { Switch } from "../../components/ui/switch";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";

const statusMap = {
  pending: { label: "قيد الانتظار", variant: "secondary", icon: Clock, color: "text-amber-500", bg: "bg-amber-50", border: "border-amber-200" },
  confirmed: { label: "مؤكد", variant: "default", icon: CheckCircle, color: "text-green-500", bg: "bg-green-50", border: "border-green-200" },
  completed: { label: "مكتمل", variant: "outline", icon: CheckCircle, color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-200" },
  cancelled: { label: "ملغي", variant: "destructive", icon: XCircle, color: "text-red-500", bg: "bg-red-50", border: "border-red-200" },
};

const sourceMap = {
  booking: { label: "الموقع", variant: "default", color: "text-purple-600", bg: "bg-purple-100" },
  clinic: { label: "العيادة", variant: "secondary", color: "text-gray-600", bg: "bg-gray-100" },
};

// Check if appointment is within 2 hours
const isWithinTwoHours = (appointmentDate) => {
  if (!appointmentDate) return false;

  const now = new Date();
  const appointmentTime = new Date(appointmentDate);
  const timeDifference = appointmentTime.getTime() - now.getTime();
  const hoursDifference = timeDifference / (1000 * 60 * 60);

  return hoursDifference > 0 && hoursDifference <= 2;
};

// Generate WhatsApp reminder message
const generateReminderMessage = (patientName, appointmentDate) => {
  const formattedDate = format(new Date(appointmentDate), "dd/MM/yyyy", {
    locale: ar,
  });
  const formattedTime = format(new Date(appointmentDate), "hh:mm a", {
    locale: ar,
  });

  return `مرحباً ${patientName}، هذا تذكير بموعدك في العيادة بتاريخ ${formattedDate} الساعة ${formattedTime}. نرجو الحضور قبل الموعد بـ15 دقيقة.`;
};

// Format phone number for WhatsApp
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

// Mobile Card View Component
const MobileAppointmentCard = ({ appointment, onStatusChange, onViewDetails, onSendReminder, isWhatsAppEnabled, isWithinTwoHours }) => {
  const StatusIcon = statusMap[appointment.status]?.icon || AlertCircle;
  const statusInfo = statusMap[appointment.status] || statusMap.pending;
  const sourceInfo = sourceMap[appointment.from] || sourceMap.clinic;

  return (
    <div className={`bg-white rounded-2xl border ${statusInfo.border} p-4 mb-3 shadow-sm hover:shadow-md transition-shadow`}>
      {/* Card Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${statusInfo.bg}`}>
            <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg truncate max-w-[180px]">
              {appointment.patient?.name || "غير محدد"}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={`text-xs ${sourceInfo.bg} ${sourceInfo.color} border-0`}>
                {sourceInfo.label}
              </Badge>
              <Badge variant={statusInfo.variant} className="text-xs">
                {statusInfo.label}
              </Badge>
            </div>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 rounded-full">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onViewDetails(appointment.id)}>
              <Eye className="h-4 w-4 ml-2" />
              عرض التفاصيل
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.open(`tel:${appointment.patient?.phone}`)}>
              <Phone className="h-4 w-4 ml-2" />
              اتصال
            </DropdownMenuItem>
            {isWithinTwoHours(appointment.date) && (
              <DropdownMenuItem onClick={() => onSendReminder(appointment)}>
                <MessageSquare className="h-4 w-4 ml-2" />
                إرسال تذكير
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Appointment Details */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 text-gray-600">
          <div className="flex items-center gap-2 flex-1">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm">
              {appointment.date ? format(new Date(appointment.date), "dd/MM/yyyy", { locale: ar }) : "غير محدد"}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-1">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-sm">
              {appointment.date ? format(new Date(appointment.date), "hh:mm a", { locale: ar }) : "غير محدد"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-gray-600">
          <div className="flex items-center gap-2 flex-1">
            <Tag className="w-4 h-4 text-gray-400" />
            <span className="text-sm truncate">{appointment.notes || "بدون وصف"}</span>
          </div>
          <div className="flex items-center gap-2 flex-1">
            <Receipt className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium">{appointment.price ? appointment.price.toFixed(2) : "0.00"} ج.م</span>
          </div>
        </div>

        {appointment.patient?.phone && (
          <div className="flex items-center gap-2 text-gray-600">
            <Phone className="w-4 h-4 text-gray-400" />
            <span className="text-sm">{appointment.patient.phone}</span>
          </div>
        )}
      </div>

      {/* Quick Actions Footer */}
      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-9 rounded-lg"
          onClick={() => onViewDetails(appointment.id)}
        >
          <Eye className="h-3.5 w-3.5 ml-1" />
          تفاصيل
        </Button>
        
        {isWithinTwoHours(appointment.date) && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9 rounded-lg"
            onClick={() => onSendReminder(appointment)}
            disabled={!isWhatsAppEnabled}
            title={!isWhatsAppEnabled ? "الخطة الحالية لا تدعم إرسال رسائل WhatsApp" : ""}
          >
            <MessageSquare className="h-3.5 w-3.5 ml-1" />
            تذكير
          </Button>
        )}
        
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-9 rounded-lg"
          onClick={() => window.open(`tel:${appointment.patient?.phone}`)}
        >
          <Phone className="h-3.5 w-3.5 ml-1" />
          اتصال
        </Button>
      </div>
    </div>
  );
};

// Mobile Status Filter Component
const MobileStatusFilter = ({ activeStatus, onStatusChange }) => {
  const statuses = [
    { key: "all", label: "الكل", color: "bg-gray-100 text-gray-700" },
    { key: "pending", label: "قيد الانتظار", color: "bg-amber-100 text-amber-700" },
    { key: "confirmed", label: "مؤكد", color: "bg-green-100 text-green-700" },
    { key: "completed", label: "مكتمل", color: "bg-blue-100 text-blue-700" },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4">
      {statuses.map((status) => (
        <button
          key={status.key}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            activeStatus === status.key
              ? `${status.color} ring-2 ring-offset-1 ring-opacity-50`
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
          onClick={() => onStatusChange(status.key)}
        >
          {status.label}
        </button>
      ))}
    </div>
  );
};

export default function AppointmentsTable({
  appointments,
  total,
  page,
  pageSize,
  onPageChange,
  isLoading,
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: planData } = usePlan();
  
  // States
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isEmptyStateOpen, setIsEmptyStateOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mobileStatusFilter, setMobileStatusFilter] = useState("all");
  const [mobileSortBy, setMobileSortBy] = useState("date");
  const [showUpcomingOnly, setShowUpcomingOnly] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { mutate: updateStatus } = useMutation({
    mutationFn: ({ id, status }) => updateAppointment(id, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["appointments"] });
      const previousAppointments = queryClient.getQueryData(["appointments"]);
      
      queryClient.setQueryData(["appointments"], old => {
        if (!old) return old;
        return {
          ...old,
          items: old.items?.map(appointment => 
            appointment.id === id 
              ? { ...appointment, status } 
              : appointment
          ) || []
        };
      });
      
      return { previousAppointments };
    },
    onError: (err, variables, context) => {
      if (context?.previousAppointments) {
        queryClient.setQueryData(["appointments"], context.previousAppointments);
      }
      toast.error(err.message || "فشل في تحديث حالة الحجز");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["filteredPatientStats"] });
      const statusLabel = statusMap[variables.status]?.label || variables.status;
      toast.success(`تم تغيير حالة الحجز إلى: ${statusLabel}`);
    },
  });

  const handleStatusChange = (appointmentId, newStatus) => {
    updateStatus({ id: appointmentId, status: newStatus });
  };

  // Check if WhatsApp feature is enabled in the plan
  const isWhatsAppEnabled = planData?.plans?.limits?.features?.whatsapp === true;

  const handleSendReminder = (appointment) => {
    if (!isWhatsAppEnabled) {
      setIsWhatsAppModalOpen(true);
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

  const handleViewDetails = (appointmentId) => {
    navigate(`/appointments/${appointmentId}`);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["appointments"] });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Filter and sort appointments for mobile view
  const filteredAppointments = appointments?.filter(appointment => {
    if (mobileStatusFilter === "all") return true;
    return appointment.status === mobileStatusFilter;
  }) || [];

  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    if (mobileSortBy === "date") {
      return new Date(a.date) - new Date(b.date);
    }
    if (mobileSortBy === "name") {
      return (a.patient?.name || "").localeCompare(b.patient?.name || "");
    }
    return 0;
  });

  // Responsive table columns for desktop
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
            onClick={() => handleViewDetails(appointment.id)}
            title="عرض تفاصيل الحجز"
          >
            <Eye className="h-4 w-4" />
          </Button>
          
          {isWithinTwoHours(appointment.date) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-full"
              onClick={() => handleSendReminder(appointment)}
              title={!isWhatsAppEnabled ? "خطتك الحالية لا تدعم إرسال رسائل WhatsApp" : "إرسال تذكير عبر الواتساب"}
            >
              <Bell className="h-4 w-4" />
            </Button>
          )}
          
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

  // Empty State
  if (!isLoading && (!appointments || appointments.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
        <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
          <CalendarDays className="w-16 h-16 text-gray-300" />
        </div>
        <h3 className="text-2xl font-bold text-gray-700 mb-3">لا توجد مواعيد</h3>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          لم يتم إضافة أي مواعيد حتى الآن. ابدأ بإضافة موعد جديد لتنظيم جدولك
        </p>
        <Button
          onClick={() => setIsEmptyStateOpen(true)}
          className="h-14 px-8 text-lg bg-gradient-to-l from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl shadow-lg"
        >
          <Plus className="w-5 h-5 ml-2" />
          إضافة أول موعد
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Mobile View */}
      <div className="md:hidden">
        {/* Mobile Controls */}
        <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm -mx-4 px-4 py-3 mb-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-lg gap-2"
                onClick={() => setMobileFilterOpen(true)}
              >
                <Filter className="w-4 h-4" />
                <span>تصفية</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-lg gap-2"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {filteredAppointments.length}
              </Badge>
              <Select value={mobileSortBy} onValueChange={setMobileSortBy}>
                <SelectTrigger className="h-9 w-32">
                  <SelectValue placeholder="ترتيب حسب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">التاريخ</SelectItem>
                  <SelectItem value="name">الاسم</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <MobileStatusFilter
            activeStatus={mobileStatusFilter}
            onStatusChange={setMobileStatusFilter}
          />
        </div>

        {/* Mobile Cards */}
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 animate-pulse">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-200"></div>
                    <div>
                      <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 w-24 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-full bg-gray-200 rounded"></div>
                  <div className="h-3 w-3/4 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))
          ) : (
            sortedAppointments.map((appointment) => (
              <MobileAppointmentCard
                key={appointment.id}
                appointment={appointment}
                onStatusChange={handleStatusChange}
                onViewDetails={handleViewDetails}
                onSendReminder={handleSendReminder}
                isWhatsAppEnabled={isWhatsAppEnabled}
                isWithinTwoHours={isWithinTwoHours}
              />
            ))
          )}
        </div>

        {/* Mobile Pagination */}
        {!isLoading && total > pageSize && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              السابق
            </Button>
            
            <div className="text-sm text-gray-600">
              الصفحة {page} من {Math.ceil(total / pageSize)}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= Math.ceil(total / pageSize)}
              className="gap-2"
            >
              التالي
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
        {/* Desktop Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">تجربة الجوال محسنة</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Label htmlFor="upcoming-only" className="text-sm cursor-pointer">
                القادمة فقط
              </Label>
              <Switch
                id="upcoming-only"
                checked={showUpcomingOnly}
                onCheckedChange={setShowUpcomingOnly}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-2"
            >
              {isRefreshing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              تحديث
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => window.print()}
            >
              <Download className="w-4 h-4" />
              تصدير
            </Button>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="relative overflow-hidden border border-gray-200 rounded-xl bg-white">
          <div className="overflow-x-auto">
            <div className="min-w-[1000px]">
              <DataTable
                columns={columns}
                data={appointments ?? []}
                total={total}
                page={page}
                pageSize={pageSize}
                onPageChange={onPageChange}
                emptyLabel="لا توجد مواعيد"
              />
            </div>
          </div>
          
          {/* Scroll Hint */}
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none" />
          <div className="md:hidden text-center py-3 text-sm text-gray-500 border-t">
            <span className="inline-flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" />
              اسحب لليمين لمشاهدة المزيد
              <ChevronRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Filter Sheet */}
      <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl">
          <SheetHeader className="text-right">
            <SheetTitle>تصفية المواعيد</SheetTitle>
          </SheetHeader>
          
          <div className="space-y-6 mt-6">
            <div className="space-y-4">
              <h3 className="font-medium text-gray-700">حالة الموعد</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(statusMap).map(([key, status]) => (
                  <button
                    key={key}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      mobileStatusFilter === key
                        ? `${status.border} ${status.bg} ${status.color}`
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => {
                      setMobileStatusFilter(key);
                      setMobileFilterOpen(false);
                    }}
                  >
                    <status.icon className="w-5 h-5 mx-auto mb-2" />
                    <div className="text-sm font-medium">{status.label}</div>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-medium text-gray-700">خيارات أخرى</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm">القادمة فقط</span>
                  <Switch
                    checked={showUpcomingOnly}
                    onCheckedChange={setShowUpcomingOnly}
                  />
                </div>
                
                <Select value={mobileSortBy} onValueChange={setMobileSortBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="ترتيب حسب" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">التاريخ (من الأقدم)</SelectItem>
                    <SelectItem value="date-desc">التاريخ (من الأحدث)</SelectItem>
                    <SelectItem value="name">الاسم (أ-ي)</SelectItem>
                    <SelectItem value="name-desc">الاسم (ي-أ)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
            <Button
              className="w-full h-12 rounded-xl"
              onClick={() => setMobileFilterOpen(false)}
            >
              تطبيق التصفية
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* WhatsApp Feature Not Available Modal */}
      <Dialog open={isWhatsAppModalOpen} onOpenChange={setIsWhatsAppModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right">ميزة غير متوفرة</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-amber-600" />
            </div>
            <p className="text-center text-gray-600 mb-2">
              خطتك الحالية لا تدعم إرسال رسائل WhatsApp للمرضى
            </p>
            <p className="text-center text-sm text-gray-500">
              يرجى ترقية خطتك لتفعيل ميزة إرسال رسائل WhatsApp تلقائياً للمرضى.
            </p>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsWhatsAppModalOpen(false)}
              className="w-full"
            >
              إغلاق
            </Button>
            <Button 
              className="w-full bg-gradient-to-l from-green-500 to-green-600"
              onClick={() => navigate("/settings/plans")}
            >
              ترقية الخطة
            </Button>
          </DialogFooter>
        </DialogContent>  
      </Dialog>
    </>
  );
}