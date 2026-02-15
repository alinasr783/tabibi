import {format} from "date-fns";
import {ar} from "date-fns/locale";
import {
  ArrowLeft,
  Calendar,
  Edit,
  FileText,
  Wallet,
  User,
  Phone,
  Clock,
  MapPin,
  AlertCircle,
  Stethoscope,
  CheckCircle,
  XCircle,
  Clock3,
  Download,
  Printer,
  Save,
  Loader2,
  Users,
  Activity,
  Pill,
  Plus,
  X,
  Ban,
  PlayCircle,
  Info,
  ClipboardPlus,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  MessageCircle,
  History,
  Trash2,
  ChevronDown
} from "lucide-react";
import {useEffect, useMemo, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import useScrollToTop from "../../hooks/useScrollToTop";
import {Button} from "../../components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "../../components/ui/card";
import {Badge} from "../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {Input} from "../../components/ui/input";
import {Label} from "../../components/ui/label";
import {Skeleton} from "../../components/ui/skeleton";
import {Textarea} from "../../components/ui/textarea";
import { Checkbox } from "../../components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {Separator} from "../../components/ui/separator";
import useAppointment from "./useAppointment";
import useUpdateAppointmentHandler from "./useUpdateAppointmentHandler";
import useDeleteAppointment from "./useDeleteAppointment";
import { subscribeToAppointments } from "../../services/apiAppointments";
import { getIntegration } from "../../services/integrationService";
import generatePrescriptionPdfNew from "../../lib/generatePrescriptionPdfNew";
import VisitCreateForm from "../patients/VisitCreateForm";
import usePatientAppointments from "./usePatientAppointments";
import { useUserPreferences } from "../../hooks/useUserPreferences";
import {
  flattenCustomFieldTemplates,
  mergeTemplatesIntoCustomFields,
  normalizeMedicalFieldsConfig,
} from "../../lib/medicalFieldsConfig";

export default function AppointmentDetailPage() {
  useScrollToTop(); // Auto scroll to top on page load
  const {appointmentId} = useParams();
  const {data: appointment, isLoading, error, refetch} = useAppointment(appointmentId);
  const {data: patientAppointments} = usePatientAppointments(appointment?.patient?.id);
  const { data: preferences } = useUserPreferences();
  const navigate = useNavigate();
  const {handleAppointmentUpdate, isPending: isUpdating} = useUpdateAppointmentHandler();
  const {mutate: deleteAppointment, isPending: isDeleting} = useDeleteAppointment();

  const medicalFieldsConfig = useMemo(
    () => normalizeMedicalFieldsConfig(preferences?.medical_fields_config),
    [preferences?.medical_fields_config]
  );
  const appointmentFields = medicalFieldsConfig.appointment.fields;
  const appointmentSections = medicalFieldsConfig.appointment.sections;
  const appointmentCustomSections = medicalFieldsConfig.appointment.customSections;
  const appointmentAllTemplates = useMemo(
    () => flattenCustomFieldTemplates({ config: medicalFieldsConfig, context: "appointment" }),
    [medicalFieldsConfig]
  );

  const getMainSectionOrder = (key) => {
    const order = appointmentSections?.order;
    const idx = Array.isArray(order) ? order.indexOf(key) : -1;
    return idx >= 0 ? idx : 999;
  };
  
  const [hasGoogleCalendar, setHasGoogleCalendar] = useState(false);

  useEffect(() => {
    getIntegration('calendar').then(integration => {
      setHasGoogleCalendar(!!integration);
    });
  }, []);

  // Real-time subscription
  useEffect(() => {
    if (!appointment?.clinic_id) return;

    const unsubscribe = subscribeToAppointments(
      (payload) => {
        // If the update is for this appointment, refetch
        if (
          (payload.new?.id && String(payload.new.id) === String(appointmentId)) || 
          (payload.old?.id && String(payload.old.id) === String(appointmentId))
        ) {
          refetch();
        }
      },
      appointment.clinic_id
    );

    return () => {
      unsubscribe();
    };
  }, [appointment?.clinic_id, appointmentId, refetch]);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [showPrescriptionDialog, setShowPrescriptionDialog] = useState(false);
  const [showNewVisitDialog, setShowNewVisitDialog] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [selectedPhone, setSelectedPhone] = useState("");
  const [selectedPatientName, setSelectedPatientName] = useState("");
  const [medications, setMedications] = useState([]);
  
  // Add optimistic status state for instant UI updates
  const [optimisticStatus, setOptimisticStatus] = useState(null);
  
  const [editData, setEditData] = useState({
    date: "",
    notes: "",
    price: "",
    status: "",
    diagnosis: "",
    treatment: "",
    custom_fields: []
  });

  const [mobileExpanded, setMobileExpanded] = useState({
    patient_info: true,
    medical_state: true,
    extra_fields: false,
    history: false,
  });

  // Removed newVisitData state - will use VisitCreateForm directly

  // Status configs with Egyptian dialect
  const statusConfig = {
    pending: {
      label: "مستني تأكيد", 
      variant: "warning", 
      icon: Clock3, 
      color: "text-orange-600",
      bg: "bg-orange-50",
      border: "border-orange-200"
    },
    confirmed: {
      label: "متأكد", 
      variant: "success", 
      icon: CheckCircle, 
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-200"
    },
    completed: {
      label: "خلص", 
      variant: "default", 
      icon: CheckCircle, 
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-200"
    },
    cancelled: {
      label: "ملغي", 
      variant: "destructive", 
      icon: XCircle, 
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-200"
    },
    in_progress: {
      label: "بيتكشف دلوقتي", 
      variant: "info", 
      icon: Stethoscope, 
      color: "text-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-200"
    }
  };

  const sourceConfig = {
    booking: {label: "حجز من النت", variant: "info"},
    clinic: {label: "حجز في العيادة", variant: "secondary"},
    phone: {label: "حجز تليفون", variant: "default"}
  };

  useEffect(() => {
    if (appointment) {
      setEditData({
        date: appointment.date || "",
        notes: appointment.notes || "",
        price: appointment.price || "",
        status: appointment.status || "",
        diagnosis: appointment.diagnosis || "",
        treatment: appointment.treatment || "",
        custom_fields: mergeTemplatesIntoCustomFields(appointment.custom_fields || [], appointmentAllTemplates)
      });
      setOptimisticStatus(null);
    }
  }, [appointment, appointmentAllTemplates]);

  const handleEditChange = (field, value) => {
    setEditData((prev) => ({...prev, [field]: value}));
  };

  const handleAddCustomField = () => {
    if (!newField.name.trim()) return;
    
    const newFields = [
      ...editData.custom_fields,
      { 
        id: crypto.randomUUID(), 
        name: newField.name, 
        type: newField.type, 
        section_id: newField.section_id || "default",
        value: "" 
      }
    ];
    
    setEditData(prev => ({ ...prev, custom_fields: newFields }));
    setNewField({ name: "", type: "text", section_id: newField.section_id || "default" });
  };

  const handleRemoveCustomField = (id) => {
    const newFields = editData.custom_fields.filter(f => f.id !== id);
    setEditData(prev => ({ ...prev, custom_fields: newFields }));
  };

  const handleCustomFieldValueChange = (id, value) => {
    const newFields = editData.custom_fields.map(f => 
      f.id === id ? { ...f, value } : f
    );
    setEditData(prev => ({ ...prev, custom_fields: newFields }));
  };

  const renderCustomFieldValueInput = (field) => {
    if (field.type === "textarea") {
      return (
        <Textarea
          value={field.value ?? ""}
          onChange={(e) => handleCustomFieldValueChange(field.id, e.target.value)}
          className="min-h-[80px] text-sm"
          placeholder={field.placeholder || ""}
        />
      );
    }

    if (field.type === "number") {
      return (
        <Input
          type="number"
          value={field.value ?? ""}
          onChange={(e) => handleCustomFieldValueChange(field.id, e.target.value)}
          className="text-sm"
          placeholder={field.placeholder || ""}
        />
      );
    }

    if (field.type === "date") {
      return (
        <Input
          type="date"
          value={field.value ?? ""}
          onChange={(e) => handleCustomFieldValueChange(field.id, e.target.value)}
          className="text-sm"
        />
      );
    }

    if (field.type === "checkbox") {
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={Boolean(field.value)}
            onCheckedChange={(checked) => handleCustomFieldValueChange(field.id, checked)}
          />
          <span className="text-sm text-muted-foreground">نعم / لا</span>
        </div>
      );
    }

    return (
      <Input
        value={field.value ?? ""}
        onChange={(e) => handleCustomFieldValueChange(field.id, e.target.value)}
        className="text-sm"
        placeholder={field.placeholder || ""}
      />
    );
  };

  const handleSaveEdit = async () => {
    await handleAppointmentUpdate(appointmentId, editData);
    setIsEditModalOpen(false);
    refetch();
  };

  const handleDelete = () => {
    deleteAppointment(appointmentId, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
        navigate(-1);
      },
    });
  };

  const handleStatusChange = async (newStatus) => {
    try {
      // Set optimistic status immediately for instant UI update
      setOptimisticStatus(newStatus);
      setEditData(prev => ({ ...prev, status: newStatus }));
      
      // Then update in backend
      await handleAppointmentUpdate(appointmentId, { ...editData, status: newStatus });
      
      // Refetch to ensure consistency
      refetch();
    } catch (error) {
      console.error("Error updating status:", error);
      // Revert optimistic update on error
      setOptimisticStatus(null);
      refetch();
    }
  };

  const addMedication = () => {
    setMedications([...medications, { name: '', using: '' }]);
  };

  const removeMedication = (index) => {
    if (medications.length > 1) {
      const newMedications = medications.filter((_, i) => i !== index);
      setMedications(newMedications);
    }
  };

  const updateMedication = (index, field, value) => {
    const newMedications = [...medications];
    newMedications[index][field] = value;
    setMedications(newMedications);
  };

  const handleCreateNewVisit = () => {
    setShowNewVisitDialog(true);
  };

  const handleVisitCreated = () => {
    setShowNewVisitDialog(false);
    alert("تم إضافة الكشف بنجاح!");
    refetch();
  };

  const handleVisitCancel = () => {
    setShowNewVisitDialog(false);
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

  const handlePrescriptionDialogOpen = () => {
    // Initialize with one empty medication when opening the dialog
    if (medications.length === 0) {
      setMedications([{ name: '', using: '' }]);
    }
    setShowPrescriptionDialog(true);
  };

  const handleCreatePrescription = async () => {
    try {
      const validMedications = medications.filter(m => m.name.trim() !== '');
      if (validMedications.length === 0) {
        // You might want to show a toast here instead of alert
        alert("من فضلك اكتب دواء واحد على الأقل");
        return;
      }

      await generatePrescriptionPdfNew(
        {
            patient: appointment?.patient,
            doctor: appointment?.doctor,
            date: new Date(),
            medications: validMedications,
            diagnosis: editData.diagnosis // Add diagnosis if available
        },
        appointment?.doctor?.name || "د. طبيبي", // Fallback doctor name
        "عيادة طبيبي", // Fallback clinic name - ideally this comes from settings
        "العنوان", // Fallback address
        false // shareViaWhatsApp
      );
      
      setShowPrescriptionDialog(false);
    } catch (error) {
      console.error("Error generating prescription:", error);
      alert("حصل مشكلة وأحنا بنعمل الروشتة");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "EEEE، d MMMM yyyy - hh:mm a", {locale: ar});
    } catch {
      return dateString;
    }
  };

  const calculatePatientAge = (birthDate) => {
    if (!birthDate) return "مش معروف";
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return `${age} سنة`;
  };

  const LoadingSkeleton = () => (
    <div className="min-h-screen bg-background p-3 md:p-6 pb-20 md:pb-0" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>
        {Array.from({length: 3}).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  if (isLoading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="min-h-screen bg-background p-3 md:p-6" dir="rtl">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl md:text-2xl font-bold text-foreground">تفاصيل الحجز</h1>
            <Button variant="ghost" className="gap-2" onClick={() => navigate(-1)}>
              <ArrowLeft className="size-4" />
              رجوع
            </Button>
          </div>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-12 text-center">
              <AlertCircle className="size-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-700 mb-2">في مشكلة</h3>
              <p className="text-red-600 mb-4">مش قادرين نجيب تفاصيل الحجز</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => refetch()} variant="outline" className="border-red-300">
                  حاول تاني
                </Button>
                <Button onClick={() => navigate(-1)} variant="ghost">
                  ارجع
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getGoogleCalendarUrl = () => {
    if (!appointment?.date) return "#";
    const startDate = new Date(appointment.date);
    const endDate = new Date(startDate.getTime() + 30 * 60000); // 30 mins
    const formatTime = (date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "");
    
    const details = `
المريض: ${appointment.patient?.name || 'مريض'}
تليفون: ${appointment.patient?.phone || '-'}
ملاحظات: ${appointment.notes || '-'}
    `.trim();

    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: "حجز عيادة طبيبي",
      dates: `${formatTime(startDate)}/${formatTime(endDate)}`,
      details: details,
      location: "العيادة"
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  const rawStatus = optimisticStatus || appointment?.status;
  const currentStatus = rawStatus?.toLowerCase() || 'pending';
  const StatusIcon = statusConfig[currentStatus]?.icon || Clock3;

  return (
    <div className="min-h-screen bg-background p-3 md:p-6 pb-20 md:pb-0" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex-1 min-w-0 flex items-center gap-3">
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => navigate(-1)}>
              <ArrowLeft className="size-4 rotate-180" /> {/* Rotated for RTL Back */}
            </Button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl md:text-2xl font-bold text-foreground">تفاصيل الحجز</h1>
              </div>
              <p className="text-xs text-muted-foreground">
                تاريخ الإنشاء: {format(new Date(appointment?.created_at || appointment?.date || Date.now()), "d MMM yyyy - hh:mm a", {locale: ar})}
              </p>
            </div>
          </div>
        </div>

        {/* Status Control - Improved */}
        <Card className={`overflow-hidden border transition-all duration-300 ${statusConfig[currentStatus]?.border} ${statusConfig[currentStatus]?.bg}/30 shadow-sm`}>
           <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
             <div className={`flex items-center gap-3 w-full sm:w-auto`}>
               <div className={`p-2.5 rounded-full shadow-sm ${statusConfig[currentStatus]?.bg} border ${statusConfig[currentStatus]?.border}`}>
                 <StatusIcon className={`size-5 ${statusConfig[currentStatus]?.color}`} />
               </div>
               <div className="flex-1 sm:hidden">
                 <h3 className={`font-bold ${statusConfig[currentStatus]?.color}`}>{statusConfig[currentStatus]?.label}</h3>
               </div>
             </div>
             
             <div className="flex-1 min-w-0 grid gap-1.5">
               <Label className="text-xs text-muted-foreground hidden sm:block">حالة الحجز</Label>
               <Select
                  value={currentStatus}
                  onValueChange={handleStatusChange}
                  disabled={isUpdating}
                  dir="rtl"
               >
                 <SelectTrigger className="h-10 w-full sm:w-[280px] font-medium bg-background/80 border-muted/40 transition-all hover:bg-background">
                   <SelectValue placeholder="اختر الحالة" />
                 </SelectTrigger>
                 <SelectContent>
                   {Object.entries(statusConfig).map(([key, config]) => {
                     const Icon = config.icon;
                     return (
                       <SelectItem key={key} value={key} className="cursor-pointer">
                         <div className="flex items-center gap-2">
                           <Icon className={`size-4 ${config.color}`} />
                           <span>{config.label}</span>
                         </div>
                       </SelectItem>
                     );
                   })}
                 </SelectContent>
               </Select>
             </div>

             <div className="flex gap-2 items-center mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                  <Badge variant={sourceConfig[appointment?.from]?.variant || "secondary"} className="h-7 px-3 text-xs shadow-sm">
                    {sourceConfig[appointment?.from]?.label}
                  </Badge>
                  {appointment?.priority === 'high' && (
                    <Badge variant="destructive" className="h-7 px-3 text-xs shadow-sm animate-pulse">عاجل</Badge>
                  )}
             </div>
           </CardContent>
        </Card>

        {/* Quick Actions - Moved to top */}
        <Card className="bg-card/70 border-muted/20 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardPlus className="size-5 text-primary" />
              إجراءات سريعة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className="justify-start gap-2 text-sm h-9 hover:bg-primary/5 hover:border-primary/30" 
                onClick={() => setIsEditModalOpen(true)}>
                <Edit className="size-3.5" />
                تعديل
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="justify-start gap-2 text-sm h-9 hover:bg-primary/5 hover:border-primary/30" 
                onClick={handlePrescriptionDialogOpen}>
                <Pill className="size-3.5" />
                روشتة
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="justify-start gap-2 text-sm h-9 hover:bg-primary/5 hover:border-primary/30" 
                onClick={() => window.print()}>
                <Printer className="size-3.5" />
                اطبع
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="justify-start gap-2 text-sm h-9 hover:bg-green-50 hover:border-green-200 hover:text-green-700" 
                onClick={() => {
                  if (appointment?.patient?.phone) {
                     window.open(`https://wa.me/2${appointment.patient.phone}`, '_blank');
                  } else {
                     alert("رقم التليفون مش موجود");
                  }
                }}>
                <MessageCircle className="size-3.5" />
                واتساب
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="justify-start gap-2 text-sm h-9 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700" 
                onClick={() => {
                  if (appointment?.patient?.phone) {
                     window.location.href = `tel:${appointment.patient.phone}`;
                  } else {
                     alert("رقم التليفون مش موجود");
                  }
                }}>
                <Phone className="size-3.5" />
                اتصال
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="justify-start gap-2 text-sm h-9 hover:bg-red-50 hover:border-red-200 hover:text-red-700" 
                onClick={() => setIsDeleteDialogOpen(true)}>
                <Trash2 className="size-3.5" />
                حذف الحجز
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="justify-start gap-2 text-sm h-9 bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary" 
                onClick={handleCreateNewVisit}>
                <ClipboardPlus className="size-3.5" />
                <span className="font-medium">كشف جديد</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Column */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {appointmentSections?.items?.patient_info?.enabled !== false && (
            <Card className="bg-card/70" style={{ order: getMainSectionOrder("patient_info") }}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="size-5 text-primary" />
                    {appointmentSections?.items?.patient_info?.title || "معلومات المريض"}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs gap-1"
                      onClick={() => navigate(`/patients/${appointment?.patient?.id}`)}
                    >
                      ملف المريض
                      <ArrowLeft className="size-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 sm:hidden"
                      onClick={() => setMobileExpanded((p) => ({ ...p, patient_info: !p.patient_info }))}
                    >
                      <ChevronDown className={`size-4 transition-transform ${mobileExpanded.patient_info ? "rotate-180" : ""}`} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className={`space-y-6 ${mobileExpanded.patient_info ? "block" : "hidden"} sm:block`}>
                {/* Basic Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex items-center gap-3 p-2.5 rounded-lg border border-transparent hover:border-muted/30 hover:bg-muted/30 transition-all">
                      <div className="p-2 bg-primary/10 rounded-full shrink-0">
                         <User className="size-4 text-primary" />
                      </div>
                      <div className="flex items-center gap-2">
                         <span className="text-sm text-muted-foreground">الاسم:</span>
                         <span className="font-medium text-foreground">{appointment?.patient?.name || "-"}</span>
                      </div>
                    </div>

                    <div 
                      className="flex items-center gap-3 p-2.5 rounded-lg border border-transparent hover:border-muted/30 hover:bg-muted/30 transition-all cursor-pointer"
                      onClick={() => handlePhoneClick(appointment?.patient?.phone, appointment?.patient?.name)}
                    >
                      <div className="p-2 bg-primary/10 rounded-full shrink-0">
                         <Phone className="size-4 text-primary" />
                      </div>
                      <div className="flex items-center gap-2">
                         <span className="text-sm text-muted-foreground">التليفون:</span>
                         <span className="font-medium font-mono text-foreground" dir="ltr">{appointment?.patient?.phone || "-"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-2.5 rounded-lg border border-transparent hover:border-muted/30 hover:bg-muted/30 transition-all">
                      <div className="p-2 bg-primary/10 rounded-full shrink-0">
                         <Calendar className="size-4 text-primary" />
                      </div>
                      <div className="flex items-center gap-2">
                         <span className="text-sm text-muted-foreground">السن:</span>
                         <span className="font-medium text-foreground">
                            {appointment?.patient?.birthDate 
                              ? calculatePatientAge(appointment?.patient?.birthDate) 
                              : appointment?.patient?.age 
                                ? `${appointment.patient.age} ${appointment.patient.age_unit === 'months' ? 'شهر' : appointment.patient.age_unit === 'days' ? 'يوم' : 'سنة'}`
                                : "—"}
                         </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-2.5 rounded-lg border border-transparent hover:border-muted/30 hover:bg-muted/30 transition-all">
                      <div className="p-2 bg-primary/10 rounded-full shrink-0">
                         <Users className="size-4 text-primary" />
                      </div>
                      <div className="flex items-center gap-2">
                         <span className="text-sm text-muted-foreground">النوع:</span>
                         <span className="font-medium text-foreground">
                            {appointment?.patient?.gender === 'male' ? 'ذكر' : appointment?.patient?.gender === 'female' ? 'أنثى' : '—'}
                         </span>
                      </div>
                    </div>
                </div>

                <Separator />

                {medicalFieldsConfig.appointment.patient_info_subsections?.medical_history?.enabled !== false && (
                <div className="space-y-3">
                   <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
                     <Activity className="size-4 text-orange-500" />
                     {medicalFieldsConfig.appointment.patient_info_subsections?.medical_history?.title || "الحالة الطبية"}
                   </h4>
                   
                   {/* Chronic Diseases */}
                   <div className="bg-orange-50/50 rounded-lg p-3 border border-orange-100">
                     <span className="text-xs font-medium text-orange-800 block mb-2">أمراض مزمنة</span>
                     {(appointment?.patient?.medical_history?.chronic_diseases && appointment.patient.medical_history.chronic_diseases.length > 0) ? (
                        <div className="flex flex-wrap gap-1.5">
                          {appointment.patient.medical_history.chronic_diseases.map((disease, idx) => (
                            <Badge key={idx} variant="outline" className="bg-white text-orange-700 border-orange-200">
                              {disease}
                            </Badge>
                          ))}
                        </div>
                     ) : (
                        <p className="text-xs text-muted-foreground">لا يوجد أمراض مزمنة مسجلة</p>
                     )}
                   </div>

                   {/* Allergies */}
                   <div className="bg-red-50/50 rounded-lg p-3 border border-red-100">
                     <span className="text-xs font-medium text-red-800 block mb-2">حساسية</span>
                     {(appointment?.patient?.medical_history?.allergies && appointment.patient.medical_history.allergies.length > 0) ? (
                        <div className="flex flex-wrap gap-1.5">
                          {appointment.patient.medical_history.allergies.map((allergy, idx) => (
                            <Badge key={idx} variant="outline" className="bg-white text-red-700 border-red-200">
                              {allergy}
                            </Badge>
                          ))}
                        </div>
                     ) : (
                        <p className="text-xs text-muted-foreground">لا يوجد حساسية مسجلة</p>
                     )}
                   </div>
                </div>
                )}

                {/* Insurance Info */}
                {medicalFieldsConfig.appointment.patient_info_subsections?.insurance?.enabled !== false && (appointment?.patient?.insurance_info && Object.keys(appointment?.patient?.insurance_info).length > 0) && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
                        <ShieldCheck className="size-4 text-blue-500" />
                        {medicalFieldsConfig.appointment.patient_info_subsections?.insurance?.title || "التأمين"}
                      </h4>
                      <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100 grid grid-cols-2 gap-3">
                         <div>
                            <span className="text-[10px] text-blue-600/80 block">شركة التأمين</span>
                            <span className="text-sm font-medium text-blue-900">
                              {appointment.patient.insurance_info.provider_name || "—"}
                            </span>
                         </div>
                         <div>
                            <span className="text-[10px] text-blue-600/80 block">رقم البوليصة</span>
                            <span className="text-sm font-medium text-blue-900">
                              {appointment.patient.insurance_info.policy_number || "—"}
                            </span>
                         </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            )}

            {appointmentSections?.items?.medical_state?.enabled !== false && (
            <Card className="bg-card/70" style={{ order: getMainSectionOrder("medical_state") }}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="size-5 text-primary" />
                    {appointmentSections?.items?.medical_state?.title || "الملاحظات والتشخيص"}
                  </CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 sm:hidden"
                    onClick={() => setMobileExpanded((p) => ({ ...p, medical_state: !p.medical_state }))}
                  >
                    <ChevronDown className={`size-4 transition-transform ${mobileExpanded.medical_state ? "rotate-180" : ""}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className={`space-y-4 ${mobileExpanded.medical_state ? "block" : "hidden"} sm:block`}>
                {appointmentFields.notes?.enabled !== false && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">
                      {appointmentFields.notes?.label || "ملاحظات"}
                    </Label>
                    <Textarea
                      className="min-h-[80px] text-sm"
                      placeholder={appointmentFields.notes?.placeholder || "اكتب ملاحظات هنا..."}
                      value={editData.notes}
                      onChange={(e) => handleEditChange("notes", e.target.value)}
                    />
                  </div>
                )}
                {appointmentFields.diagnosis?.enabled !== false && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">
                      {appointmentFields.diagnosis?.label || "التشخيص"}
                    </Label>
                    <Textarea 
                      className="min-h-[80px] text-sm"
                      placeholder={appointmentFields.diagnosis?.placeholder || "اكتب التشخيص هنا..."}
                      value={editData.diagnosis}
                      onChange={(e) => handleEditChange("diagnosis", e.target.value)}
                    />
                  </div>
                )}
                {appointmentFields.treatment?.enabled !== false && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">
                      {appointmentFields.treatment?.label || "العلاج"}
                    </Label>
                    <Textarea 
                      className="min-h-[80px] text-sm"
                      placeholder={appointmentFields.treatment?.placeholder || "اكتب خطة العلاج هنا..."}
                      value={editData.treatment}
                      onChange={(e) => handleEditChange("treatment", e.target.value)}
                    />
                  </div>
                )}
                <Button 
                  onClick={handleSaveEdit}
                  disabled={isUpdating}
                  size="sm"
                  className="w-full sm:w-auto gap-2"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      بيحفظ...
                    </>
                  ) : (
                    <>
                      <Save className="size-3.5" />
                      احفظ التعديلات
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
            )}

            {appointmentSections?.items?.extra_fields?.enabled !== false && (editData.custom_fields?.length > 0 || appointmentAllTemplates.length > 0) && (
              <Card className="bg-card/70" style={{ order: getMainSectionOrder("extra_fields") }}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="size-5 text-primary" />
                      {appointmentSections?.items?.extra_fields?.title || "حقول إضافية"}
                    </CardTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 sm:hidden"
                      onClick={() => setMobileExpanded((p) => ({ ...p, extra_fields: !p.extra_fields }))}
                    >
                      <ChevronDown className={`size-4 transition-transform ${mobileExpanded.extra_fields ? "rotate-180" : ""}`} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className={`space-y-4 ${mobileExpanded.extra_fields ? "block" : "hidden"} sm:block`}>
                  <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-end">
                    <div className="sm:col-span-3">
                      <Label className="text-[10px] text-muted-foreground mb-1 block">اسم الحقل</Label>
                      <Input
                        value={newField.name}
                        onChange={(e) => setNewField((prev) => ({ ...prev, name: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddCustomField();
                          }
                        }}
                        placeholder="مثال: ضغط الدم"
                        className="text-sm"
                      />
                    </div>

                    <div className="sm:col-span-1">
                      <Label className="text-[10px] text-muted-foreground mb-1 block">القسم</Label>
                      <Select
                        value={newField.section_id || "default"}
                        onValueChange={(value) => setNewField((prev) => ({ ...prev, section_id: value }))}
                        dir="rtl"
                      >
                        <SelectTrigger className="h-10 w-full justify-between text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">{appointmentSections?.items?.extra_fields?.title || "حقول إضافية"}</SelectItem>
                          {appointmentCustomSections.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="sm:col-span-1">
                      <Label className="text-[10px] text-muted-foreground mb-1 block">النوع</Label>
                      <Select
                        value={newField.type}
                        onValueChange={(value) => setNewField((prev) => ({ ...prev, type: value }))}
                        dir="rtl"
                      >
                        <SelectTrigger className="h-10 w-full justify-between text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">نص</SelectItem>
                          <SelectItem value="number">رقم</SelectItem>
                          <SelectItem value="date">تاريخ</SelectItem>
                          <SelectItem value="textarea">نص طويل</SelectItem>
                          <SelectItem value="checkbox">صح/غلط</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="sm:col-span-1 gap-2"
                      onClick={handleAddCustomField}
                      disabled={!newField.name.trim()}
                    >
                      <Plus className="size-4" />
                      إضافة
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {[{ id: "default", title: appointmentSections?.items?.extra_fields?.title || "حقول إضافية", enabled: true }, ...appointmentCustomSections]
                      .filter((s) => s.enabled !== false)
                      .map((s) => {
                        const fields = (editData.custom_fields || []).filter(
                          (f) => String(f?.section_id || "default") === String(s.id)
                        );
                        if (fields.length === 0) return null;
                        return (
                          <div key={s.id} className="space-y-2">
                            <div className="text-sm font-semibold">{s.title}</div>
                            <div className="space-y-2">
                              {fields.map((field) => (
                                <div key={field.id} className="rounded-lg border p-3 bg-card/50 space-y-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="text-sm font-semibold">{field.name}</div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => handleRemoveCustomField(field.id)}
                                    >
                                      <Trash2 className="size-4 text-destructive" />
                                    </Button>
                                  </div>
                                  {renderCustomFieldValueInput(field)}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            )}

            {appointmentSections?.items?.history?.enabled !== false && (
            <Card className="bg-card/70 border-muted/20 shadow-sm" style={{ order: getMainSectionOrder("history") }}>
               <CardHeader className="pb-3">
                 <div className="flex items-center justify-between">
                   <CardTitle className="flex items-center gap-2 text-base">
                     <History className="size-5 text-primary" />
                     {appointmentSections?.items?.history?.title || "سجل زيارات المريض"}
                   </CardTitle>
                   <Button
                     type="button"
                     variant="ghost"
                     size="icon"
                     className="h-8 w-8 sm:hidden"
                     onClick={() => setMobileExpanded((p) => ({ ...p, history: !p.history }))}
                   >
                     <ChevronDown className={`size-4 transition-transform ${mobileExpanded.history ? "rotate-180" : ""}`} />
                   </Button>
                 </div>
               </CardHeader>
               <CardContent className={`${mobileExpanded.history ? "block" : "hidden"} sm:block`}>
                 {!patientAppointments ? (
                   <div className="space-y-3">
                      <Skeleton className="h-12 w-full rounded-lg" />
                      <Skeleton className="h-12 w-full rounded-lg" />
                   </div>
                 ) : patientAppointments.length === 0 ? (
                   <div className="text-center py-8 text-muted-foreground">
                     <History className="size-10 mx-auto mb-3 opacity-20" />
                     <p>لا يوجد زيارات سابقة</p>
                   </div>
                 ) : (
                   <div className="space-y-2">
                     {patientAppointments.slice(0, 5).map((apt) => (
                       <div key={apt.id} className="flex items-center justify-between p-3 rounded-lg border border-transparent hover:border-muted/30 hover:bg-muted/30 transition-all group">
                         <div className="flex items-center gap-3">
                           <div className={`w-1.5 h-1.5 rounded-full ${statusConfig[apt.status]?.bg || 'bg-gray-400'}`} />
                           <div>
                             <p className="font-medium text-sm">
                               {format(new Date(apt.date), "d MMMM yyyy", {locale: ar})}
                             </p>
                             <p className="text-xs text-muted-foreground flex items-center gap-1">
                               {format(new Date(apt.date), "hh:mm a", {locale: ar})}
                             </p>
                           </div>
                         </div>
                         <div className="flex items-center gap-3">
                           <Badge variant="outline" className="font-normal h-6 text-xs">
                             {statusConfig[apt.status]?.label || apt.status}
                           </Badge>
                           <Button variant="ghost" size="icon" className="h-8 w-8 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity" onClick={() => navigate(`/appointments/${apt.id}`)}>
                             <ExternalLink className="size-3.5" />
                           </Button>
                         </div>
                       </div>
                     ))}
                     {patientAppointments.length > 5 && (
                       <Button variant="ghost" className="w-full text-xs text-muted-foreground mt-2" onClick={() => navigate(`/patients/${appointment?.patient?.id}`)}>
                         عرض كل الزيارات ({patientAppointments.length})
                       </Button>
                     )}
                   </div>
                 )}
               </CardContent>
            </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Appointment Time */}
            <Card className="bg-card/70">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="size-5 text-primary" />
                  الميعاد
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-1">
                    {format(new Date(appointment?.date), "d", {locale: ar})}
                  </div>
                  <div className="text-sm font-semibold">
                    {format(new Date(appointment?.date), "MMMM yyyy", {locale: ar})}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(appointment?.date), "EEEE", {locale: ar})}
                  </div>
                </div>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Clock className="size-3.5" />
                      الوقت
                    </span>
                    <span className="font-bold">{format(new Date(appointment?.date), "hh:mm a", {locale: ar})}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="size-3.5" />
                      المكان
                    </span>
                    <span className="font-medium">العيادة</span>
                  </div>

                  {hasGoogleCalendar && (
                    <Button 
                      variant="outline" 
                      className="w-full gap-3 mt-4 h-12 relative overflow-hidden group border-muted/40 hover:border-blue-200 hover:bg-blue-50/50 transition-all shadow-sm"
                      onClick={() => window.open(getGoogleCalendarUrl(), '_blank')}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-50/0 via-blue-50/30 to-blue-50/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <img 
                        src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" 
                        alt="Google Calendar" 
                        className="size-5 shrink-0"
                      />
                      <span className="font-medium text-foreground group-hover:text-blue-700">Open on Google Calendar</span>
                      <ExternalLink className="size-3.5 ml-auto text-muted-foreground group-hover:text-blue-600" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Edit className="size-5" />
              تعديل الحجز
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="date" className="text-sm">التاريخ والوقت</Label>
              <Input
                id="date"
                type="datetime-local"
                value={editData.date ? new Date(editData.date).toISOString().slice(0, 16) : ""}
                onChange={(e) => handleEditChange("date", e.target.value)}
                className="w-full mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="status" className="text-sm">الحالة</Label>
              <Select
                value={editData.status}
                onValueChange={(value) => handleEditChange("status", value)}
                dir="rtl"
              >
                <SelectTrigger id="status" className="h-10 w-full mt-1.5 justify-between">
                  <SelectValue placeholder="اختر الحالة" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="price" className="text-sm">السعر</Label>
              <Input
                id="price"
                type="number"
                value={editData.price}
                onChange={(e) => handleEditChange("price", e.target.value)}
                placeholder="0.00"
                className="w-full mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="notes" className="text-sm">ملاحظات</Label>
              <Textarea
                id="notes"
                value={editData.notes}
                onChange={(e) => handleEditChange("notes", e.target.value)}
                placeholder="اكتب ملاحظات..."
                className="w-full min-h-[80px] mt-1.5"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="w-[25%]">
              إلغاء
            </Button>
            <Button onClick={handleSaveEdit} disabled={isUpdating} className="w-[75%] gap-2">
              {isUpdating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  بيحفظ...
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  احفظ
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Prescription Dialog */}
      <Dialog open={showPrescriptionDialog} onOpenChange={setShowPrescriptionDialog}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">


          <DialogHeader className="pb-3">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              {/* <Pill className="size-5 text-primary" /> */}
              اكتب روشتة
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-2 space-y-4">
            <div className="bg-blue-500 dark:bg-blue-600 rounded-lg p-3.5 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2">
                <Info className="size-4 text-white" />
                <p className="text-sm font-medium text-white">
                  اكتب الأدوية والجرعات بتاعة المريض
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              {medications.map((med, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3 bg-card/50">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {index + 1}
                      </span>
                      دواء #{index + 1}
                    </h4>
                    {medications.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMedication(index)}
                        className="text-destructive hover:text-destructive h-8 w-8 p-0"
                      >
                        <X className="size-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor={`med-${index}`} className="text-xs font-medium text-muted-foreground mb-1 block">
                        اسم الدواء
                      </Label>
                      <Input 
                        id={`med-${index}`}
                        placeholder="مثال: أوجمنتين 1 جم"
                        value={med.name}
                        onChange={(e) => updateMedication(index, 'name', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor={`usage-${index}`} className="text-xs font-medium text-muted-foreground mb-1 block">
                        طريقة الاستخدام
                      </Label>
                      <Input 
                        id={`usage-${index}`}
                        placeholder="مثال: قرص كل 12 ساعة بعد الأكل"
                        value={med.using}
                        onChange={(e) => updateMedication(index, 'using', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <Button 
              variant="outline" 
              onClick={addMedication}
              className="w-full gap-2 text-sm h-10 hidden"
              size="sm"
            >
              <Plus className="size-4" />
              <span>ضيف دواء تاني</span>
            </Button>
          </div>
          
          <DialogFooter className="flex gap-2 pt-4 border-t w-full">
            <Button variant="outline" onClick={() => setShowPrescriptionDialog(false)} className="w-[25%]">
              إلغاء
            </Button>
            <Button 
              onClick={handleCreatePrescription} 
              className="w-[75%] bg-primary hover:bg-primary/90 text-white flex items-center justify-center gap-2"
            >
              <Save className="size-4" />
              <span>احفظ الروشتة</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Visit Dialog - Using Same Form as Patient Page */}
      <Dialog open={showNewVisitDialog} onOpenChange={setShowNewVisitDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <ClipboardPlus className="size-5" />
              إضافة كشف جديد
            </DialogTitle>
          </DialogHeader>
          <VisitCreateForm 
            patientId={appointment?.patient?.id}
            appointmentId={appointmentId}
            onVisitCreated={handleVisitCreated}
            onCancel={handleVisitCancel}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="size-5" />
              حذف الحجز نهائياً
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              هل أنت متأكد أنك تريد حذف هذا الحجز نهائياً؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
              className="flex-1"
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1"
            >
              {isDeleting ? <Loader2 className="size-4 animate-spin" /> : "حذف نهائي"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}
