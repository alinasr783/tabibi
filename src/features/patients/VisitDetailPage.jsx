import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
    ArrowRight,
    Calendar,
    Edit,
    FileText,
    Pill,
    Printer,
    Stethoscope,
    X,
    Plus,
    User,
    ClipboardPlus,
    Clock,
    Activity,
    CalendarPlus,
    FileUp,
    MessageCircle,
    Phone
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { SkeletonLine } from "../../components/ui/skeleton";
import { Textarea } from "../../components/ui/textarea";
import { Checkbox } from "../../components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import generatePrescriptionPdfNew from "../../lib/generatePrescriptionPdfNew";
import { useAuth } from "../auth/AuthContext";
import useClinic from "../auth/useClinic";
import usePlan from "../auth/usePlan";
import useUpdateVisit from "./useUpdateVisit";
import useVisit from "./useVisit";
import AppointmentCreateDialog from "../calendar/AppointmentCreateDialog";
import { UploadDialog } from "./PatientAttachmentsTab";
import { usePatientAttachments } from "./usePatientAttachments";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useUserPreferences } from "../../hooks/useUserPreferences";
import {
  flattenCustomFieldTemplates,
  mergeTemplatesIntoCustomFields,
  normalizeMedicalFieldsConfig,
} from "../../lib/medicalFieldsConfig";

export default function VisitDetailPage() {
  const {visitId} = useParams();
  const {data: visit, isLoading, error} = useVisit(visitId);
  const {data: clinic} = useClinic();
  const {user} = useAuth();
  const {data: planData} = usePlan();
  const { data: preferences } = useUserPreferences();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {mutate: updateVisit, isPending: isUpdating} = useUpdateVisit();

  const medicalFieldsConfig = useMemo(
    () => normalizeMedicalFieldsConfig(preferences?.medical_fields_config),
    [preferences?.medical_fields_config]
  );
  const visitFields = medicalFieldsConfig.visit.fields;
  const visitSections = medicalFieldsConfig.visit.sections;
  const visitCustomSections = medicalFieldsConfig.visit.customSections;
  const visitAllTemplates = useMemo(
    () => flattenCustomFieldTemplates({ config: medicalFieldsConfig, context: "visit" }),
    [medicalFieldsConfig]
  );
  
  // New State for Dialogs
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  
  // Existing State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDiagnosisEditModalOpen, setIsDiagnosisEditModalOpen] = useState(false);
  const [isNotesEditModalOpen, setIsNotesEditModalOpen] = useState(false);
  const [isTreatmentEditModalOpen, setIsTreatmentEditModalOpen] = useState(false);
  const [isFollowUpEditModalOpen, setIsFollowUpEditModalOpen] = useState(false);
  const [isMedicationsEditModalOpen, setIsMedicationsEditModalOpen] = useState(false);
  const [isCustomFieldsEditModalOpen, setIsCustomFieldsEditModalOpen] = useState(false);
  const [editData, setEditData] = useState({
    diagnosis: "",
    treatment: "",
    follow_up: "",
    notes: "",
    medications: [],
    custom_fields: [],
  });

  const [newField, setNewField] = useState({ name: "", type: "text", section_id: "default" });

  // Attachments Hook
  const { uploadAttachment, isUploading: isUploadingAttachment } = usePatientAttachments(visit?.patient_id);

  // Handlers for New Actions
  const handleAppointmentCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["patient-appointments", visit?.patient_id] });
    setIsAppointmentDialogOpen(false);
    toast.success("تم حجز الموعد بنجاح");
  };

  const handleUpload = (data) => {
    if (!visit?.patient_id) return;
    uploadAttachment({ ...data, patientId: visit.patient_id }, {
      onSuccess: () => {
        setIsUploadDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: ["patient-attachments", visit.patient_id] });
        toast.success("تم رفع الملف بنجاح");
      }
    });
  };

  const handleSendWhatsApp = () => {
    if (!visit?.patient?.phone) {
      toast.error("لا يوجد رقم هاتف للمريض");
      return;
    }

    let phone = visit.patient.phone.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '2' + phone; 
    
    let message = `مرحباً ${visit.patient.name}،\n\nإليك الأدوية الموصوفة من د. ${user?.name || 'الطبيب'}:\n\n`;
    
    if (visit.medications && visit.medications.length > 0) {
        visit.medications.forEach((med, index) => {
            message += `${index + 1}. ${med.name}\n   ${med.using}\n`;
        });
    } else {
        message += "لا توجد أدوية مسجلة في هذا الكشف.\n";
    }

    if (clinic?.name) message += `\n${clinic.name}`;
    if (clinic?.address) message += `\n${clinic.address}`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleCallPatient = () => {
    if (!visit?.patient?.phone) {
      toast.error("لا يوجد رقم هاتف للمريض");
      return;
    }
    window.location.href = `tel:${visit.patient.phone}`;
  };

  // Initialize edit data when visit loads
  useEffect(() => {
    if (!visit) return;
    setEditData({
      diagnosis: visit.diagnosis || "",
      treatment: visit.treatment || "",
      follow_up: visit.follow_up || "",
      notes: visit.notes || "",
      medications: visit.medications ? [...visit.medications] : [],
      custom_fields: mergeTemplatesIntoCustomFields(visit.custom_fields || [], visitAllTemplates),
    });
  }, [visit, visitAllTemplates]);

  const handleEditChange = (field, value) => {
    setEditData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleMedicationChange = (index, field, value) => {
    setEditData((prev) => {
      const newMedications = [...prev.medications];
      newMedications[index] = {
        ...newMedications[index],
        [field]: value,
      };
      return {
        ...prev,
        medications: newMedications,
      };
    });
  };

  const addMedication = () => {
    setEditData((prev) => ({
      ...prev,
      medications: [...prev.medications, {name: "", using: ""}],
    }));
  };

  const removeMedication = (index) => {
    setEditData((prev) => {
      const newMedications = [...prev.medications];
      newMedications.splice(index, 1);
      return {
        ...prev,
        medications: newMedications,
      };
    });
  };

  const openDiagnosisEditModal = () => {
    setEditData({
      diagnosis: visit?.diagnosis || "",
      treatment: visit?.treatment || "",
      follow_up: visit?.follow_up || "",
      notes: visit?.notes || "",
      medications: visit?.medications ? [...visit.medications] : [],
      custom_fields: mergeTemplatesIntoCustomFields(visit?.custom_fields || [], visitAllTemplates),
    });
    setIsDiagnosisEditModalOpen(true);
  };

  const openNotesEditModal = () => {
    setEditData({
      diagnosis: visit?.diagnosis || "",
      treatment: visit?.treatment || "",
      follow_up: visit?.follow_up || "",
      notes: visit?.notes || "",
      medications: visit?.medications ? [...visit.medications] : [],
      custom_fields: mergeTemplatesIntoCustomFields(visit?.custom_fields || [], visitAllTemplates),
    });
    setIsNotesEditModalOpen(true);
  };

  const openMedicationsEditModal = () => {
    setEditData({
      diagnosis: visit?.diagnosis || "",
      treatment: visit?.treatment || "",
      follow_up: visit?.follow_up || "",
      notes: visit?.notes || "",
      medications: visit?.medications ? [...visit.medications] : [],
      custom_fields: mergeTemplatesIntoCustomFields(visit?.custom_fields || [], visitAllTemplates),
    });
    setIsMedicationsEditModalOpen(true);
  };

  const openTreatmentEditModal = () => {
    setEditData({
      diagnosis: visit?.diagnosis || "",
      treatment: visit?.treatment || "",
      follow_up: visit?.follow_up || "",
      notes: visit?.notes || "",
      medications: visit?.medications ? [...visit.medications] : [],
      custom_fields: mergeTemplatesIntoCustomFields(visit?.custom_fields || [], visitAllTemplates),
    });
    setIsTreatmentEditModalOpen(true);
  };

  const openFollowUpEditModal = () => {
    setEditData({
      diagnosis: visit?.diagnosis || "",
      treatment: visit?.treatment || "",
      follow_up: visit?.follow_up || "",
      notes: visit?.notes || "",
      medications: visit?.medications ? [...visit.medications] : [],
      custom_fields: mergeTemplatesIntoCustomFields(visit?.custom_fields || [], visitAllTemplates),
    });
    setIsFollowUpEditModalOpen(true);
  };

  const openCustomFieldsEditModal = () => {
    setEditData({
      diagnosis: visit?.diagnosis || "",
      treatment: visit?.treatment || "",
      follow_up: visit?.follow_up || "",
      notes: visit?.notes || "",
      medications: visit?.medications ? [...visit.medications] : [],
      custom_fields: mergeTemplatesIntoCustomFields(visit?.custom_fields || [], visitAllTemplates),
    });
    setIsCustomFieldsEditModalOpen(true);
  };

  const handleAddCustomField = () => {
    if (!newField.name.trim()) return;
    const next = [
      ...(Array.isArray(editData.custom_fields) ? editData.custom_fields : []),
      {
        id: crypto.randomUUID(),
        name: newField.name.trim(),
        type: newField.type,
        section_id: newField.section_id || "default",
        value: "",
      },
    ];
    setEditData((prev) => ({ ...prev, custom_fields: next }));
    setNewField({ name: "", type: "text", section_id: newField.section_id || "default" });
  };

  const handleRemoveCustomField = (id) => {
    const next = (Array.isArray(editData.custom_fields) ? editData.custom_fields : []).filter((f) => f.id !== id);
    setEditData((prev) => ({ ...prev, custom_fields: next }));
  };

  const handleCustomFieldValueChange = (id, value) => {
    const next = (Array.isArray(editData.custom_fields) ? editData.custom_fields : []).map((f) =>
      f.id === id ? { ...f, value } : f
    );
    setEditData((prev) => ({ ...prev, custom_fields: next }));
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

  const handleSaveDiagnosis = () => {
    updateVisit(
      {id: visitId, diagnosis: editData.diagnosis},
      {
        onSuccess: () => {
          setIsDiagnosisEditModalOpen(false);
          window.location.reload();
        },
        onError: (error) => {
          alert("حدث خطأ أثناء تحديث التشخيص: " + error.message);
        },
      }
    );
  };

  const handleSaveNotes = () => {
    updateVisit(
      {id: visitId, notes: editData.notes},
      {
        onSuccess: () => {
          setIsNotesEditModalOpen(false);
          window.location.reload();
        },
        onError: (error) => {
          alert("حدث خطأ أثناء تحديث الملاحظات: " + error.message);
        },
      }
    );
  };

  const handleSaveTreatment = () => {
    updateVisit(
      { id: visitId, treatment: editData.treatment },
      {
        onSuccess: () => {
          setIsTreatmentEditModalOpen(false);
          window.location.reload();
        },
        onError: (error) => {
          alert("حدث خطأ أثناء تحديث العلاج: " + error.message);
        },
      }
    );
  };

  const handleSaveFollowUp = () => {
    updateVisit(
      { id: visitId, follow_up: editData.follow_up },
      {
        onSuccess: () => {
          setIsFollowUpEditModalOpen(false);
          window.location.reload();
        },
        onError: (error) => {
          alert("حدث خطأ أثناء تحديث المتابعة: " + error.message);
        },
      }
    );
  };

  const handleSaveCustomFields = () => {
    updateVisit(
      { id: visitId, custom_fields: editData.custom_fields },
      {
        onSuccess: () => {
          setIsCustomFieldsEditModalOpen(false);
          window.location.reload();
        },
        onError: (error) => {
          alert("حدث خطأ أثناء تحديث الحقول الإضافية: " + error.message);
        },
      }
    );
  };

  const handleSaveMedications = () => {
    updateVisit(
      {id: visitId, medications: editData.medications},
      {
        onSuccess: () => {
          setIsMedicationsEditModalOpen(false);
          window.location.reload();
        },
        onError: (error) => {
          alert("حدث خطأ أثناء تحديث الأدوية: " + error.message);
        },
      }
    );
  };

  const handleGeneratePdf = async () => {
    const missingFields = [];
    if (!clinic?.name || clinic.name.trim() === '' || clinic.name === 'عيادة تجريبيّة') missingFields.push("اسم العيادة");
    if (!clinic?.address || clinic.address.trim() === '' || clinic.address === 'عنوان العيادة التجريبيّة') missingFields.push("عنوان العيادة");
    if (!user?.name || user.name.trim() === '') missingFields.push("الاسم الشخصي");
    if (!user?.phone || user.phone.trim() === '') missingFields.push("رقم الهاتف");

    if (missingFields.length > 0) {
      alert(`عفواً، لا يمكن إنشاء الروشتة قبل إكمال البيانات التالية في صفحة الإعدادات:\n- ${missingFields.join('\n- ')}\n\nيرجى الذهاب إلى صفحة الإعدادات > بياناتك لإكمال هذه البيانات.`);
      return;
    }

    if (visit && clinic && user) {
      try {
        await generatePrescriptionPdfNew(
          visit,
          user.name,
          clinic.name,
          clinic.address,
          planData 
        );
      } catch (error) {
        console.error("Error in PDF generation:", error);
        alert("حدث خطأ أثناء إنشاء الروشتة. يرجى المحاولة مرة أخرى.");
      }
    } else {
      console.log("Missing data for PDF generation");
      alert(
        "لا توجد بيانات كافية لإنشاء الروشتة. يرجى التأكد من تحميل جميع البيانات."
      );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-muted animate-pulse"></div>
            <div className="space-y-2">
              <SkeletonLine width={150} height={20} />
              <SkeletonLine width={100} height={14} />
            </div>
          </div>
          <SkeletonLine width={80} height={36} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-[var(--radius)] animate-pulse"></div>
          ))}
        </div>
        <div className="h-32 bg-muted rounded-[var(--radius)] animate-pulse"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">تفاصيل الكشف</h1>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
            <ArrowRight className="w-4 h-4" />
            رجوع
          </Button>
        </div>
        <Card className="border-destructive">
          <CardContent className="py-8 text-center text-destructive">
            حصل مشكلة: {error.message}
          </CardContent>
        </Card>
      </div>
    );
  }

  const customFields = mergeTemplatesIntoCustomFields(
    Array.isArray(visit?.custom_fields) ? visit.custom_fields : [],
    visitAllTemplates
  );

  return (
    <div className="space-y-6 pb-6" dir="rtl">
      {/* Header - Visit Info */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(-1)}
          className="h-10 w-10 shrink-0 rounded-lg border-dashed"
        >
          <ArrowRight className="w-5 h-5" />
        </Button>

        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/10">
          <Stethoscope className="h-6 w-6 text-primary" />
        </div>
        
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-foreground truncate leading-tight">
            تفاصيل الكشف
          </h1>
          <div className="text-sm text-muted-foreground mt-0.5 font-medium flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            {visit?.created_at
              ? format(new Date(visit.created_at), "d MMMM yyyy - h:mm a", { locale: ar })
              : "غير محدد"
            }
          </div>
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        {/* Patient Info */}
        <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
          <CardContent className="p-2 md:p-3">
            <div className="flex items-center gap-2 mb-1">
              <User className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
              <span className="text-[10px] md:text-xs font-medium text-slate-600 dark:text-slate-400">المريض</span>
            </div>
            {visit?.patient ? (
              <Link to={`/patients/${visit.patient_id}`} className="text-xs md:text-base font-bold text-slate-900 dark:text-slate-100 hover:text-primary hover:underline transition-colors truncate block">
                {visit.patient.name}
              </Link>
            ) : (
              <p className="text-xs md:text-base font-bold text-slate-900 dark:text-slate-100">غير محدد</p>
            )}
          </CardContent>
        </Card>
        
        {/* Date Info */}
        <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
          <CardContent className="p-2 md:p-3">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-[10px] md:text-xs font-medium text-slate-600 dark:text-slate-400">التاريخ</span>
            </div>
            <p className="text-xs md:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
              {visit?.created_at ? format(new Date(visit.created_at), "d MMMM yyyy", { locale: ar }) : "-"}
            </p>
          </CardContent>
        </Card>
        
        {/* Visit Type/Status */}
        <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
          <CardContent className="p-2 md:p-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[10px] md:text-xs font-medium text-slate-600 dark:text-slate-400">النوع</span>
            </div>
            <p className="text-xs md:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
               كشف جديد
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-card border-border/50 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4 border-b border-border/50 bg-muted/20">
          <CardTitle className="text-base flex items-center gap-2 text-primary">
            <ClipboardPlus className="w-5 h-5" />
            إجراءات سريعة
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {visitFields.diagnosis?.enabled !== false && (
              <Button 
                  variant="outline" 
                  className="justify-start gap-2 h-11 hover:bg-primary/5 hover:border-primary/30 transition-all shadow-sm" 
                  onClick={openDiagnosisEditModal}
              >
                  <Edit className="w-4 h-4 text-primary" />
                  تعديل {visitFields.diagnosis?.label || "التشخيص"}
              </Button>
            )}
            {visitFields.notes?.enabled !== false && (
              <Button 
                  variant="outline" 
                  className="justify-start gap-2 h-11 hover:bg-primary/5 hover:border-primary/30 transition-all shadow-sm" 
                  onClick={openNotesEditModal}
              >
                  <FileText className="w-4 h-4 text-blue-600" />
                  تعديل {visitFields.notes?.label || "الملاحظات"}
              </Button>
            )}
            {visitFields.treatment?.enabled !== false && (
              <Button 
                  variant="outline" 
                  className="justify-start gap-2 h-11 hover:bg-primary/5 hover:border-primary/30 transition-all shadow-sm" 
                  onClick={openTreatmentEditModal}
              >
                  <FileText className="w-4 h-4 text-emerald-600" />
                  تعديل {visitFields.treatment?.label || "العلاج"}
              </Button>
            )}
            {visitFields.follow_up?.enabled !== false && (
              <Button 
                  variant="outline" 
                  className="justify-start gap-2 h-11 hover:bg-primary/5 hover:border-primary/30 transition-all shadow-sm" 
                  onClick={openFollowUpEditModal}
              >
                  <FileText className="w-4 h-4 text-violet-600" />
                  تعديل {visitFields.follow_up?.label || "المتابعة"}
              </Button>
            )}
            {(customFields.length > 0 || visitAllTemplates.length > 0) && (
              <Button 
                  variant="outline" 
                  className="justify-start gap-2 h-11 hover:bg-primary/5 hover:border-primary/30 transition-all shadow-sm" 
                  onClick={openCustomFieldsEditModal}
              >
                  <FileText className="w-4 h-4 text-slate-600" />
                  تعديل الحقول الإضافية
              </Button>
            )}
            <Button 
                variant="outline" 
                className="justify-start gap-2 h-11 hover:bg-primary/5 hover:border-primary/30 transition-all shadow-sm" 
                onClick={openMedicationsEditModal}
            >
                <Pill className="w-4 h-4 text-amber-600" />
                تعديل الأدوية
            </Button>
            <Button 
                variant="outline" 
                className="justify-start gap-2 h-11 hover:bg-primary/5 hover:border-primary/30 transition-all shadow-sm" 
                onClick={() => setIsAppointmentDialogOpen(true)}
            >
                <CalendarPlus className="w-4 h-4 text-indigo-600" />
                حجز استشارة
            </Button>
            <Button 
                variant="outline" 
                className="justify-start gap-2 h-11 hover:bg-primary/5 hover:border-primary/30 transition-all shadow-sm" 
                onClick={() => setIsUploadDialogOpen(true)}
            >
                <FileUp className="w-4 h-4 text-orange-600" />
                رفع مرفقات
            </Button>
            <Button 
                variant="outline" 
                className="justify-start gap-2 h-11 hover:bg-primary/5 hover:border-primary/30 transition-all shadow-sm" 
                onClick={handleSendWhatsApp}
            >
                <MessageCircle className="w-4 h-4 text-green-600" />
                إرسال واتساب
            </Button>
            <Button 
                variant="outline" 
                className="justify-start gap-2 h-11 hover:bg-primary/5 hover:border-primary/30 transition-all shadow-sm" 
                onClick={handleCallPatient}
            >
                <Phone className="w-4 h-4 text-cyan-600" />
                اتصال بالمريض
            </Button>
            {visit?.medications && visit.medications.length > 0 && (
                <Button 
                    variant="outline" 
                    className="justify-start gap-2 h-11 hover:bg-primary/5 hover:border-primary/30 transition-all shadow-sm" 
                    onClick={handleGeneratePdf}
                >
                    <Printer className="w-4 h-4 text-purple-600" />
                    طباعة الروشتة
                </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs Content */}
      <Tabs defaultValue="details" className="w-full" dir="rtl">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="details">التفاصيل</TabsTrigger>
          <TabsTrigger value="medications">الأدوية</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 gap-4">
            {visitFields.diagnosis?.enabled !== false && (
              <Card className="bg-card/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2 text-muted-foreground mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span className="text-xs font-medium">{visitFields.diagnosis?.label || "التشخيص"}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={openDiagnosisEditModal} className="h-6 w-6 p-1">
                      <Edit className="w-3 h-3" />
                    </Button>
                  </div>
                  <p className="text-sm text-right whitespace-pre-wrap">{visit?.diagnosis || "لا يوجد"}</p>
                </CardContent>
              </Card>
            )}

            {visitFields.notes?.enabled !== false && (
              <Card className="bg-card/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2 text-muted-foreground mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span className="text-xs font-medium">{visitFields.notes?.label || "ملاحظات"}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={openNotesEditModal} className="h-6 w-6 p-1">
                      <Edit className="w-3 h-3" />
                    </Button>
                  </div>
                  <p className="text-sm whitespace-pre-wrap text-right">{visit?.notes || "لا يوجد"}</p>
                </CardContent>
              </Card>
            )}

            {visitFields.treatment?.enabled !== false && (
              <Card className="bg-card/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2 text-muted-foreground mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span className="text-xs font-medium">{visitFields.treatment?.label || "العلاج"}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={openTreatmentEditModal} className="h-6 w-6 p-1">
                      <Edit className="w-3 h-3" />
                    </Button>
                  </div>
                  <p className="text-sm whitespace-pre-wrap text-right">{visit?.treatment || "لا يوجد"}</p>
                </CardContent>
              </Card>
            )}

            {visitFields.follow_up?.enabled !== false && (
              <Card className="bg-card/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2 text-muted-foreground mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span className="text-xs font-medium">{visitFields.follow_up?.label || "متابعة"}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={openFollowUpEditModal} className="h-6 w-6 p-1">
                      <Edit className="w-3 h-3" />
                    </Button>
                  </div>
                  <p className="text-sm whitespace-pre-wrap text-right">{visit?.follow_up || "لا يوجد"}</p>
                </CardContent>
              </Card>
            )}

            {visitSections?.items?.extra_fields?.enabled !== false && (customFields.length > 0 || visitAllTemplates.length > 0) && (
              <Card className="bg-card/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2 text-muted-foreground mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span className="text-xs font-medium">{visitSections?.items?.extra_fields?.title || "حقول إضافية"}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={openCustomFieldsEditModal} className="h-6 w-6 p-1">
                      <Edit className="w-3 h-3" />
                    </Button>
                  </div>
                  {customFields.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-right">لا يوجد</p>
                  ) : (
                    <div className="space-y-4">
                      {[{ id: "default", title: visitSections?.items?.extra_fields?.title || "حقول إضافية", enabled: true }, ...visitCustomSections]
                        .filter((s) => s.enabled !== false)
                        .map((s) => {
                          const fields = customFields.filter((f) => String(f?.section_id || "default") === String(s.id));
                          if (fields.length === 0) return null;
                          return (
                            <div key={s.id} className="space-y-2">
                              <div className="text-sm font-semibold">{s.title}</div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {fields.map((field) => (
                                  <div key={field.id} className="p-2.5 rounded-lg border bg-card/50">
                                    <div className="text-xs text-muted-foreground mb-1">{field.name}</div>
                                    <div className="text-sm font-medium text-foreground">
                                      {field.type === "checkbox" ? (field.value ? "نعم" : "لا") : (field.value ?? "-") || "-"}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="medications" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2 text-muted-foreground mb-3">
                <div className="flex items-center gap-2">
                  <Pill className="w-4 h-4" />
                  <span className="text-sm font-medium">الأدوية</span>
                </div>
                <Button variant="ghost" size="sm" onClick={openMedicationsEditModal} className="h-8 w-8 p-1">
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
              {visit?.medications && visit.medications.length > 0 ? (
                <div className="space-y-2">
                  {visit.medications.map((medication, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-[var(--radius)] bg-muted/50"
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-xs font-medium text-primary">{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0 text-right">
                        <p className="font-medium text-sm">{medication.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{medication.using}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center">لا توجد أدوية</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals - Kept same logic */}
      <Dialog open={isDiagnosisEditModalOpen} onOpenChange={setIsDiagnosisEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل {visitFields.diagnosis?.label || "التشخيص"}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="diagnosis" className="mb-2 block">{visitFields.diagnosis?.label || "التشخيص"}</Label>
            <Textarea
              id="diagnosis"
              value={editData.diagnosis}
              onChange={(e) => handleEditChange("diagnosis", e.target.value)}
              placeholder={visitFields.diagnosis?.placeholder || "التشخيص المبدئي"}
              rows={4}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDiagnosisEditModalOpen(false)} className="w-[25%]">
              إلغاء
            </Button>
            <Button onClick={handleSaveDiagnosis} disabled={isUpdating} className="w-[75%]">
              {isUpdating ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isNotesEditModalOpen} onOpenChange={setIsNotesEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل {visitFields.notes?.label || "الملاحظات"}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="notes" className="mb-2 block">{visitFields.notes?.label || "ملاحظات"}</Label>
            <Textarea
              id="notes"
              value={editData.notes}
              onChange={(e) => handleEditChange("notes", e.target.value)}
              placeholder={visitFields.notes?.placeholder || "ملاحظات إضافية"}
              rows={4}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsNotesEditModalOpen(false)} className="w-[25%]">
              إلغاء
            </Button>
            <Button onClick={handleSaveNotes} disabled={isUpdating} className="w-[75%]">
              {isUpdating ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTreatmentEditModalOpen} onOpenChange={setIsTreatmentEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل {visitFields.treatment?.label || "العلاج"}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="treatment" className="mb-2 block">{visitFields.treatment?.label || "العلاج"}</Label>
            <Textarea
              id="treatment"
              value={editData.treatment}
              onChange={(e) => handleEditChange("treatment", e.target.value)}
              placeholder={visitFields.treatment?.placeholder || "اكتب خطة العلاج هنا..."}
              rows={4}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsTreatmentEditModalOpen(false)} className="w-[25%]">
              إلغاء
            </Button>
            <Button onClick={handleSaveTreatment} disabled={isUpdating} className="w-[75%]">
              {isUpdating ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isFollowUpEditModalOpen} onOpenChange={setIsFollowUpEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل {visitFields.follow_up?.label || "المتابعة"}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="follow_up" className="mb-2 block">{visitFields.follow_up?.label || "متابعة"}</Label>
            <Textarea
              id="follow_up"
              value={editData.follow_up}
              onChange={(e) => handleEditChange("follow_up", e.target.value)}
              placeholder={visitFields.follow_up?.placeholder || "اكتب ملاحظات المتابعة هنا..."}
              rows={4}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsFollowUpEditModalOpen(false)} className="w-[25%]">
              إلغاء
            </Button>
            <Button onClick={handleSaveFollowUp} disabled={isUpdating} className="w-[75%]">
              {isUpdating ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCustomFieldsEditModalOpen} onOpenChange={setIsCustomFieldsEditModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل الحقول الإضافية</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">إضافة حقل</Label>
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
                      <SelectItem value="default">{visitSections?.items?.extra_fields?.title || "حقول إضافية"}</SelectItem>
                      {visitCustomSections.map((s) => (
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

              {editData.custom_fields?.length > 0 && (
                <div className="space-y-4">
                  {[{ id: "default", title: visitSections?.items?.extra_fields?.title || "حقول إضافية", enabled: true }, ...visitCustomSections]
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
                                    <X className="size-4 text-destructive" />
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
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button className="w-[25%]" variant="outline" onClick={() => setIsCustomFieldsEditModalOpen(false)}>
              إلغاء
            </Button>
            <Button className="w-[75%]" onClick={handleSaveCustomFields} disabled={isUpdating}>
              {isUpdating ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isMedicationsEditModalOpen} onOpenChange={setIsMedicationsEditModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-primary" />
              <DialogTitle>تعديل الأدوية</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>الأدوية</Label>
                <Button variant="outline" size="sm" onClick={addMedication} className="gap-1.5">
                  <Plus className="w-4 h-4" />
                  إضافة
                </Button>
              </div>

              {editData.medications.length > 0 ? (
                <div className="space-y-2">
                  {editData.medications.map((med, index) => (
                    <div key={index} className="flex items-start gap-2 p-3 rounded-lg border bg-muted/30">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                        <Input
                          value={med.name}
                          onChange={(e) => handleMedicationChange(index, "name", e.target.value)}
                          placeholder="اسم الدواء"
                        />
                        <Input
                          value={med.using}
                          onChange={(e) => handleMedicationChange(index, "using", e.target.value)}
                          placeholder="طريقة الاستخدام"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-destructive hover:text-destructive"
                        onClick={() => removeMedication(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  مفيش أدوية
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button className="w-[25%]" variant="outline" onClick={() => setIsMedicationsEditModalOpen(false)}>
              إلغاء
            </Button>
            <Button className="w-[75%]" onClick={handleSaveMedications} disabled={isUpdating}>
              {isUpdating ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Appointment Create Dialog */}
      <AppointmentCreateDialog 
        open={isAppointmentDialogOpen} 
        onClose={() => setIsAppointmentDialogOpen(false)} 
        initialPatient={visit?.patient}
      />

      {/* Upload Dialog */}
      <UploadDialog 
        open={isUploadDialogOpen} 
        onOpenChange={setIsUploadDialogOpen} 
        onUpload={handleUpload} 
        isUploading={isUploadingAttachment} 
      />
    </div>
  );
}
