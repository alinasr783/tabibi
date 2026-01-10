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
  BadgeCheck,
  Ban,
  PlayCircle,
  Info,
  ClipboardPlus
} from "lucide-react";
import {useState, useEffect} from "react";
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
import generatePrescriptionPdfNew from "../../lib/generatePrescriptionPdfNew";
import VisitCreateForm from "../patients/VisitCreateForm";

export default function AppointmentDetailPage() {
  useScrollToTop(); // Auto scroll to top on page load
  const {appointmentId} = useParams();
  const {data: appointment, isLoading, error, refetch} = useAppointment(appointmentId);
  const navigate = useNavigate();
  const {handleAppointmentUpdate, isPending: isUpdating} = useUpdateAppointmentHandler();
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
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
    treatment: ""
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
      icon: BadgeCheck, 
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
        treatment: appointment.treatment || ""
      });
      // Reset optimistic status when real data arrives
      setOptimisticStatus(null);
    }
  }, [appointment]);

  const handleEditChange = (field, value) => {
    setEditData((prev) => ({...prev, [field]: value}));
  };

  const handleSaveEdit = async () => {
    await handleAppointmentUpdate(appointmentId, editData);
    setIsEditModalOpen(false);
    refetch();
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

  const rawStatus = optimisticStatus || appointment?.status;
  const currentStatus = rawStatus?.toLowerCase() || 'pending';
  const StatusIcon = statusConfig[currentStatus]?.icon || Clock3;

  return (
    <div className="min-h-screen bg-background p-3 md:p-6 pb-20 md:pb-0" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl md:text-2xl font-bold text-foreground">تفاصيل الحجز</h1>
              <Badge variant="outline" className="text-xs">
                #{appointmentId?.slice(-6)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              آخر تحديث: {format(new Date(appointment?.updatedAt || Date.now()), "d MMM yyyy - hh:mm a", {locale: ar})}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(true)} className="gap-1.5">
              <Edit className="size-3.5" />
              <span className="hidden sm:inline">عدل</span>
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate(-1)}>
              <ArrowLeft className="size-3.5" />
              رجوع
            </Button>
          </div>
        </div>

        {/* Status Card */}
        <Card className={`${statusConfig[currentStatus]?.bg} ${statusConfig[currentStatus]?.border} border-2`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-[var(--radius)] ${statusConfig[currentStatus]?.bg}`}>
                <StatusIcon className={`size-6 ${statusConfig[currentStatus]?.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-foreground">{statusConfig[currentStatus]?.label}</h3>
                <div className="flex flex-wrap gap-2 mt-1">
                  <Badge variant={sourceConfig[appointment?.from]?.variant || "secondary"} className="text-xs">
                    {sourceConfig[appointment?.from]?.label}
                  </Badge>
                  {appointment?.priority === 'high' && (
                    <Badge variant="destructive" className="text-xs">عاجل</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions - Moved to top */}
        <Card className="bg-card/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">إجراءات سريعة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className="justify-start gap-2 text-sm h-9" 
                onClick={handlePrescriptionDialogOpen}>
                <Pill className="size-3.5" />
                اكتب روشتة
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="justify-start gap-2 text-sm h-9" 
                onClick={() => window.print()}>
                <Printer className="size-3.5" />
                اطبع
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="sm:col-span-2 justify-start gap-2 text-sm h-9 bg-primary/5 hover:bg-primary/10 border-primary/20" 
                onClick={handleCreateNewVisit}>
                <ClipboardPlus className="size-3.5 text-primary" />
                <span className="font-medium">ضيف كشف جديد</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Status Change */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(statusConfig).map(([key, config]) => {
            const Icon = config.icon;
            if (key === currentStatus) return null;
            return (
              <Button
                key={key}
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8"
                onClick={() => handleStatusChange(key)}
                disabled={isUpdating}
              >
                <Icon className="size-3.5" />
                {config.label}
              </Button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Patient Info */}
            <Card className="bg-card/70">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="size-5 text-primary" />
                  معلومات المريض
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">الاسم</Label>
                    <Button 
                      variant="link" 
                      className="font-bold text-lg p-0 h-auto hover:text-primary"
                      onClick={() => navigate(`/patients/${appointment?.patient?.id}`)}>
                      {appointment?.patient?.name || "-"}
                    </Button>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">التليفون</Label>
                    <Button 
                      variant="link" 
                      className="flex items-center gap-2 p-0 h-auto font-medium hover:text-primary"
                      onClick={() => handlePhoneClick(appointment?.patient?.phone, appointment?.patient?.name)}>
                      <Phone className="size-3.5 text-muted-foreground" />
                      <span>{appointment?.patient?.phone || "-"}</span>
                    </Button>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">العمر</Label>
                    <div className="font-medium">
                      {appointment?.patient?.birthDate 
                        ? calculatePatientAge(appointment?.patient?.birthDate) 
                        : appointment?.patient?.age 
                          ? `${appointment.patient.age} ${appointment.patient.age_unit === 'months' ? 'شهر' : appointment.patient.age_unit === 'days' ? 'يوم' : 'سنة'}`
                          : "مش معروف"}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">رقم الملف</Label>
                    <div className="font-medium">#{appointment?.patient?.fileNumber || "—"}</div>
                  </div>
                </div>
                <Separator />
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => navigate(`/patients/${appointment?.patient?.id}`)}>
                  شوف الملف الكامل
                </Button>
              </CardContent>
            </Card>

            {/* Notes & Medical Details */}
            <Card className="bg-card/70">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="size-5 text-primary" />
                    الملاحظات والتشخيص
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">ملاحظات</Label>
                  <Textarea
                    className="min-h-[80px] text-sm"
                    placeholder="اكتب ملاحظات هنا..."
                    value={editData.notes}
                    onChange={(e) => handleEditChange("notes", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">التشخيص</Label>
                  <Textarea 
                    className="min-h-[80px] text-sm"
                    placeholder="اكتب التشخيص هنا..."
                    value={editData.diagnosis}
                    onChange={(e) => handleEditChange("diagnosis", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">العلاج</Label>
                  <Textarea 
                    className="min-h-[80px] text-sm"
                    placeholder="اكتب خطة العلاج هنا..."
                    value={editData.treatment}
                    onChange={(e) => handleEditChange("treatment", e.target.value)}
                  />
                </div>
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
            onVisitCreated={handleVisitCreated}
            onCancel={handleVisitCancel}
          />
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
