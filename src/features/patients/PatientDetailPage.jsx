import { ArrowLeft, Phone, Cake, Calendar, Wallet, User, MessageCircle, Edit, ClipboardList, Stethoscope, CreditCard, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import PatientEditDialog from "./PatientEditDialog";
import PatientProfileTab from "./PatientProfileTab";
import PatientAttachmentsTab from "./PatientAttachmentsTab";
import { SkeletonLine } from "../../components/ui/skeleton";
import usePatient from "./usePatient";
import usePatientAppointments from "../calendar/usePatientAppointments";
import PatientAppointmentsHistory from "./PatientAppointmentsHistory";
import useVisits from "./useVisits";
import PatientVisitsTable from "./PatientVisitsTable";
import { useQueryClient } from "@tanstack/react-query";
import useTreatmentTemplates from "../treatment-plans/useTreatmentTemplates";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import PatientPlanAssignmentForm from "./PatientPlanAssignmentForm";
import { usePatientPlans } from "./usePatientPlans";
import usePatientFinancialData from "./usePatientFinancialData";
import { Eye } from "lucide-react";

export default function PatientDetailPage() {
  const { id: patientId } = useParams();
  const navigate = useNavigate();
  
  // Debug: Log the patientId from the URL
  console.log("PatientDetailPage - URL patientId:", patientId);
  const location = useLocation();
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Apply scroll to top on route changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const { data: patient, isLoading: isPatientLoading, isError } = usePatient(patientId);
  const { data: financialData, isLoading: isFinancialLoading } = usePatientFinancialData(patientId);
  const { data: visits, isLoading: isVisitsLoading } = useVisits(patientId);
  const { data: appointments, isLoading: isAppointmentsLoading } = usePatientAppointments(patientId);

  const handleVisitAdded = () => {
    // Invalidate visits query to refresh the data
    queryClient.invalidateQueries({ queryKey: ["visits", patientId] });
  };

  // Calculate patient age
  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const birthDate = new Date(dateOfBirth);
    const age = Math.floor((new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
    return age;
  };

  let patientAge = calculateAge(patient?.date_of_birth);
  let patientAgeUnit = "سنة";
  
  if (!patientAge && patient?.age) {
      patientAge = patient.age;
      patientAgeUnit = patient.age_unit === 'months' ? 'شهر' : patient.age_unit === 'days' ? 'يوم' : 'سنة';
  }

  // Share latest prescription via WhatsApp
  const shareLatestPrescription = () => {
    // Find the latest visit with medications
    const latestVisitWithMedications = visits?.find(visit => 
      visit.medications && Array.isArray(visit.medications) && visit.medications.length > 0
    );

    if (!latestVisitWithMedications) {
      alert("لا توجد وصفة طبية متاحة للمشاركة");
      return;
    }

    // Get patient phone number
    const phoneNumber = patient?.phone?.replace(/\D/g, '');
    if (!phoneNumber) {
      alert("رقم هاتف المريض غير متوفر");
      return;
    }

    // Format phone number for WhatsApp (assuming Egyptian numbers)
    let formattedPhone = phoneNumber;
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "2" + formattedPhone;
    } else if (!formattedPhone.startsWith("20")) {
      formattedPhone = "20" + formattedPhone;
    }

    // Create medications list
    let medicationsList = "";
    if (
      latestVisitWithMedications.medications &&
      Array.isArray(latestVisitWithMedications.medications) &&
      latestVisitWithMedications.medications.length > 0
    ) {
      medicationsList = latestVisitWithMedications.medications
        .map(
          (med, index) =>
            `${index + 1}. ${med.name || ""}\n   ${med.using || ""}`
        )
        .join("\n\n");
    } else {
      medicationsList = "لا توجد أدوية محددة";
    }

    // Create WhatsApp message
    const message = `*مرحباً ${patient?.name || 'سيد/سيدة'}*

نرجو منك الالتزام بالتعليمات التالية:

${medicationsList}

*تاريخ الزيارة:* ${
      latestVisitWithMedications.created_at
        ? new Date(latestVisitWithMedications.created_at).toLocaleDateString("ar-EG")
        : "غير محدد"
    }

نشكرك على ثقتك بعيادتنا!`;

    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);

    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;

    // Open WhatsApp in new tab
    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="space-y-6" dir="rtl">
      {isError ? (
        <div className="text-center py-12">
          <User className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">العميل مش موجود</h2>
          <p className="text-muted-foreground mb-4">العميل اللي بتحاول تشاهده مفيش في قاعدة البيانات</p>
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            رجوع للصفحة السابقة
          </Button>
        </div>
      ) : isPatientLoading ? (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted animate-pulse"></div>
            <div className="space-y-2">
              <SkeletonLine width={150} height={24} />
              <SkeletonLine width={100} height={16} />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="h-20 bg-muted rounded-[var(--radius)] animate-pulse"></div>)}</div>
        </div>
      ) : !patient ? (
        <div className="text-center py-12">
          <User className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">العميل مش موجود</h2>
          <p className="text-muted-foreground mb-4">العميل اللي بتحاول تشاهده مفيش في قاعدة البيانات</p>
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            رجوع للصفحة السابقة
          </Button>
        </div>
      ) : (
        <>
          {/* Header - Patient Info */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4" style={{ direction: 'rtl' }}>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-7 h-7 text-primary" />
              </div>
              <div style={{ direction: 'rtl' }}>
                <h1 className="text-xl font-bold">{patient?.name}</h1>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                  {patient?.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      {patient.phone}
                    </span>
                  )}
                  {patientAge && (
                    <span className="flex items-center gap-1">
                      <Cake className="w-3.5 h-3.5" />
                      {patientAge} {patientAgeUnit}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditDialogOpen(true)}
                className="gap-1.5"
                disabled={!patient}  // Disable if patient data is not loaded
              >
                <Edit className="w-4 h-4" />
                تعديل
              </Button>
              
              {patient?.phone && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={shareLatestPrescription}
                  className="gap-1.5"
                  disabled={!patient}  // Disable if patient data is not loaded
                >
                  <MessageCircle className="w-4 h-4" />
                  واتساب
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                رجوع
              </Button>
            </div>
          </div>

          {/* Quick Info Cards */}
          <div className="grid grid-cols-3 gap-3" dir="rtl">
            {/* Total Amount */}
            <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">الإجمالي</span>
                </div>
                <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {financialData?.totalAmount?.toFixed(0) || 0} جنيه
                </p>
              </CardContent>
            </Card>
            
            {/* Paid */}
            <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">المدفوع</span>
                </div>
                <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {financialData?.paidAmount?.toFixed(0) || 0} جنيه
                </p>
              </CardContent>
            </Card>
            
            {/* Remaining */}
            <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">المتبقي</span>
                </div>
                <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {financialData?.remainingAmount?.toFixed(0) || 0} جنيه
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for Sections */}
          <Tabs defaultValue="profile" className="w-full" style={{ direction: 'rtl' }}>
            <TabsList className="w-full md:w-auto grid grid-cols-5 md:inline-flex h-auto p-1 bg-muted/50">
              <TabsTrigger value="profile" className="text-xs md:text-sm py-2 px-3 gap-1.5">
                <User className="w-4 h-4" />
                <span>الملف</span>
              </TabsTrigger>
              <TabsTrigger value="visits" className="text-xs md:text-sm py-2 px-3 gap-1.5">
                <Stethoscope className="w-4 h-4" />
                <span>الكشوفات</span>
              </TabsTrigger>
              <TabsTrigger value="attachments" className="text-xs md:text-sm py-2 px-3 gap-1.5">
                <FileText className="w-4 h-4" />
                <span>الملف</span>
              </TabsTrigger>
              <TabsTrigger value="appointments" className="text-xs md:text-sm py-2 px-3 gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>المواعيد</span>
              </TabsTrigger>
              <TabsTrigger value="plans" className="text-xs md:text-sm py-2 px-3 gap-1.5">
                <ClipboardList className="w-4 h-4" />
                <span>الخطط</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-4">
              <PatientProfileTab patient={patient} />
            </TabsContent>

            <TabsContent value="attachments" className="mt-4">
              <PatientAttachmentsTab patientId={patientId} />
            </TabsContent>

            <TabsContent value="visits" className="mt-4">
              <PatientVisitsTable 
                visits={visits} 
                isLoading={isVisitsLoading} 
                patientId={patientId}
                onVisitAdded={handleVisitAdded}
              />
            </TabsContent>

            <TabsContent value="appointments" className="mt-4">
              <PatientAppointmentsHistory 
                appointments={appointments} 
                isLoading={isAppointmentsLoading}
                patientId={patientId}
              />
            </TabsContent>

            <TabsContent value="plans" className="mt-4">
              <PatientTreatmentPlansTable patientId={patientId} />
            </TabsContent>
          </Tabs>

          <PatientEditDialog
            open={isEditDialogOpen}
            onClose={() => setIsEditDialogOpen(false)}
            patient={patient}
          />
        </>
      )}
    </div>
  );
}

// Treatment Plans Table Component
function PatientTreatmentPlansTable({ patientId }) {
  const { data: templates, isLoading: isTemplatesLoading } = useTreatmentTemplates();
  const { data: patientPlans, isLoading: isPlansLoading, refetch } = usePatientPlans(patientId);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const navigate = useNavigate();

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setIsFormOpen(true);
    setIsOpen(false);
  };

  const handlePlanAssigned = () => {
    refetch();
  };

  const statusConfig = {
    active: { label: "نشطة", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200" },
    completed: { label: "مكتملة", className: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200" },
    cancelled: { label: "ملغية", className: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200" },
  };

  return (
    <>
      {/* Header with Add Button */}
      <div className="flex items-center justify-between mb-4" style={{ direction: 'rtl' }}>
        <h3 className="text-sm font-medium text-muted-foreground">الخطط العلاجية</h3>
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="gap-1.5" disabled={!patientId}>
              <ClipboardList className="w-4 h-4" />
              إضافة خطة
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {isTemplatesLoading ? (
              <DropdownMenuItem>
                <div className="w-full flex justify-center py-2">
                  <div className="h-2 w-20 bg-muted rounded animate-pulse"></div>
                </div>
              </DropdownMenuItem>
            ) : templates && templates.length > 0 ? (
              templates.map((template) => (
                <DropdownMenuItem 
                  key={template.id} 
                  className="flex flex-col items-start p-2.5 cursor-pointer"
                  onSelect={() => handleTemplateSelect(template)}
                >
                  <div className="text-sm font-medium">{template.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {template.session_price} جنيه/جلسة
                  </div>
                </DropdownMenuItem>
              ))
            ) : (
              <DropdownMenuItem disabled>
                <span className="text-xs text-muted-foreground">مفيش خطط متاحة</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Plans List */}
      {isPlansLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-[var(--radius)] animate-pulse"></div>
          ))}
        </div>
      ) : patientPlans && patientPlans.length > 0 ? (
        <div className="space-y-2">
          {patientPlans.map((plan) => (
            <div
              key={plan.id}
              onClick={() => navigate(`/patients/${patientId}/plans/${plan.id}`)}
              className="cursor-pointer"
            >
              <Card className="hover:bg-muted/50 transition-colors group">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {plan.treatment_templates?.name || "-"}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig[plan.status]?.className || ''}`}>
                          {statusConfig[plan.status]?.label || plan.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{plan.total_sessions} جلسة</span>
                        <span>{plan.total_price} جنيه</span>
                      </div>
                    </div>
                    <Eye className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-sm">
          مفيش خطط علاجية للمريض ده
        </div>
      )}

      <PatientPlanAssignmentForm
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        template={selectedTemplate}
        patientId={patientId}
        onPlanAssigned={handlePlanAssigned}
      />
    </>
  );
}
