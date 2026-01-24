import { ArrowRight, Phone, Calendar, Wallet, User, Edit, ClipboardList, Stethoscope, CreditCard, FileText, Upload, Plus, FileUp, Banknote, ClipboardPlus, X, MessageCircle, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import PatientEditDialog from "./PatientEditDialog";
import PatientProfileTab from "./PatientProfileTab";
import PatientAttachmentsTab, { UploadDialog } from "./PatientAttachmentsTab";
import { usePatientAttachments } from "./usePatientAttachments";
import VisitCreateForm from "./VisitCreateForm";
import AppointmentCreateDialog from "../calendar/AppointmentCreateDialog";
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
import PatientTransactionDialog from "./PatientTransactionDialog";
import { toast } from "sonner";

export default function PatientDetailPage() {
  const { id: patientId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  
  const { data: templates } = useTreatmentTemplates();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isVisitDialogOpen, setIsVisitDialogOpen] = useState(false);
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [transactionType, setTransactionType] = useState("charge"); // 'charge' or 'payment'
  const [activeTab, setActiveTab] = useState("profile");

  const [isPlanTemplateDialogOpen, setIsPlanTemplateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isPlanFormOpen, setIsPlanFormOpen] = useState(false);

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setIsPlanTemplateDialogOpen(false);
    setIsPlanFormOpen(true);
  };

  const handlePlanAssigned = () => {
    queryClient.invalidateQueries({ queryKey: ["patient-plans", patientId] });
  };
  
  // Hooks
  const { uploadAttachment, isUploading } = usePatientAttachments(patientId);

  const handleAppointmentCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["patient-appointments", patientId] });
    setIsAppointmentDialogOpen(false);
    toast.success("تم حجز الموعد بنجاح");
  };

  const handleUpload = (data) => {
    uploadAttachment({ ...data, patientId }, {
      onSuccess: () => {
        setIsUploadDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: ["patient-attachments", patientId] });
        toast.success("تم رفع الملف بنجاح");
      }
    });
  };

  const handleTransactionSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["patient-financial", patientId] });
    toast.success(transactionType === 'payment' ? "تم تسجيل الدفع بنجاح" : "تم إضافة المستحقات بنجاح");
  };

  const openTransactionDialog = (type) => {
    setTransactionType(type);
    setIsTransactionDialogOpen(true);
  };

  // Apply scroll to top on route changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const { data: patient, isLoading: isPatientLoading, isError } = usePatient(patientId);
  const { data: financialData, isLoading: isFinancialLoading } = usePatientFinancialData(patientId);
  const { data: visits, isLoading: isVisitsLoading } = useVisits(patientId);
  const { data: appointments, isLoading: isAppointmentsLoading } = usePatientAppointments(patientId);

  const handleVisitAdded = () => {
    queryClient.invalidateQueries({ queryKey: ["visits", patientId] });
    setIsVisitDialogOpen(false);
    toast.success("تم إضافة الكشف بنجاح");
  };

  // Calculate patient age
  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const birthDate = new Date(dateOfBirth);
    const age = Math.floor((new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
    return age;
  };

  return (
    <div className="space-y-6 pb-6" dir="rtl">
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
            <ArrowRight className="w-4 h-4" />
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
            <ArrowRight className="w-4 h-4" />
            رجوع للصفحة السابقة
          </Button>
        </div>
      ) : (
        <>
          {/* Header - Patient Info - Refined & Responsive */}
          <div className="flex items-center gap-3 mb-6" dir="rtl">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(-1)}
              className="h-10 w-10 shrink-0 rounded-lg border-dashed"
            >
              <ArrowRight className="w-5 h-5" />
            </Button>

            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/10">
              <User className="h-6 w-6 text-primary" />
            </div>
            
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold text-foreground truncate leading-tight">
                {patient?.name}
              </h1>
              {patient?.phone && (
                <div className="text-sm text-muted-foreground mt-0.5 font-medium text-right" dir="ltr">
                  {patient.phone}
                </div>
              )}
            </div>
          </div>

          {/* Quick Info Cards - Restored to Finance Page Style */}
          <div className="grid grid-cols-3 sm:grid-cols-3 gap-3" dir="rtl">
            {/* Total Income */}
            <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="w-4 h-4 text-primary" />
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
                  <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
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
                  <Wallet className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">المتبقي</span>
                </div>
                <p className={`text-base font-bold ${financialData?.remainingAmount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>
                  {financialData?.remainingAmount?.toFixed(0) || 0} جنيه
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="bg-card border-border/50 shadow-sm" dir="rtl">
            <CardHeader className="pb-3 pt-4 px-4 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-base flex items-center gap-2 text-primary">
                <ClipboardPlus className="w-5 h-5" />
                إجراءات سريعة
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button 
                    variant="outline" 
                    className="justify-start gap-2 h-11 hover:bg-primary/5 hover:border-primary/30 transition-all shadow-sm" 
                    onClick={() => setIsEditDialogOpen(true)}
                >
                    <Edit className="w-4 h-4 text-primary" />
                    تعديل الملف
                </Button>
                <Button 
                    variant="outline" 
                    className="justify-start gap-2 h-11 hover:bg-primary/5 hover:border-primary/30 transition-all shadow-sm" 
                    onClick={() => setIsVisitDialogOpen(true)}
                >
                    <ClipboardPlus className="w-4 h-4 text-blue-600" />
                    كشف جديد
                </Button>
                <Button 
                    variant="outline" 
                    className="justify-start gap-2 h-11 hover:bg-primary/5 hover:border-primary/30 transition-all shadow-sm" 
                    onClick={() => setIsUploadDialogOpen(true)}
                >
                    <FileUp className="w-4 h-4 text-amber-600" />
                    رفع ملف
                </Button>
                <Button 
                    variant="outline" 
                    className="justify-start gap-2 h-11 hover:bg-primary/5 hover:border-primary/30 transition-all shadow-sm" 
                    onClick={() => setIsAppointmentDialogOpen(true)}
                >
                    <Calendar className="w-4 h-4 text-purple-600" />
                    حجز موعد
                </Button>
                <Button 
                    variant="outline" 
                    className="justify-start gap-2 h-11 hover:bg-primary/5 hover:border-primary/30 transition-all shadow-sm" 
                    onClick={() => setIsPlanTemplateDialogOpen(true)}
                >
                    <ClipboardList className="w-4 h-4 text-indigo-600" />
                    خطة علاجية
                </Button>
                <Button 
                    variant="outline" 
                    className="justify-start gap-2 h-11 hover:bg-primary/5 hover:border-primary/30 transition-all shadow-sm" 
                    onClick={() => openTransactionDialog('charge')}
                >
                    <Banknote className="w-4 h-4 text-rose-600" />
                    إضافة مستحقات
                </Button>
                <Button 
                    variant="outline" 
                    className="justify-start gap-2 h-11 hover:bg-emerald-50 hover:border-emerald-200 transition-all shadow-sm bg-emerald-50/50" 
                    onClick={() => openTransactionDialog('payment')}
                >
                    <Wallet className="w-4 h-4 text-emerald-600" />
                    دفع مستحقات
                </Button>
                <Button 
                    variant="outline" 
                    className="justify-start gap-2 h-11 hover:bg-primary/5 hover:border-primary/30 transition-all shadow-sm" 
                    onClick={() => window.location.href = `tel:${patient?.phone}`}
                >
                    <Phone className="w-4 h-4 text-cyan-600" />
                    مكالمة
                </Button>
                <Button 
                    variant="outline" 
                    className="justify-start gap-2 h-11 hover:bg-primary/5 hover:border-primary/30 transition-all shadow-sm col-span-2" 
                    onClick={() => {
                        const phone = patient?.phone?.replace(/\D/g, ''); // Remove non-digits
                        window.open(`https://wa.me/2${phone}`, '_blank');
                    }}
                >
                    <MessageCircle className="w-4 h-4 text-green-600" />
                    تواصل عبر واتساب
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabs for Sections */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" style={{ direction: 'rtl' }}>
            <TabsList className="w-full md:w-auto grid grid-cols-5 md:inline-flex h-auto p-1 bg-muted/50 rounded-lg">
              <TabsTrigger value="profile" className="text-xs md:text-sm py-2 px-3 gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <User className="hidden md:block w-4 h-4" />
                <span>الملف</span>
              </TabsTrigger>
              <TabsTrigger value="visits" className="text-xs md:text-sm py-2 px-3 gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Stethoscope className="hidden md:block w-4 h-4" />
                <span>الكشوفات</span>
              </TabsTrigger>
              <TabsTrigger value="attachments" className="text-xs md:text-sm py-2 px-3 gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <FileText className="hidden md:block w-4 h-4" />
                <span>الملف</span>
              </TabsTrigger>
              <TabsTrigger value="appointments" className="text-xs md:text-sm py-2 px-3 gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Calendar className="hidden md:block w-4 h-4" />
                <span>المواعيد</span>
              </TabsTrigger>
              <TabsTrigger value="plans" className="text-xs md:text-sm py-2 px-3 gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <ClipboardList className="hidden md:block w-4 h-4" />
                <span>الخطط</span>
              </TabsTrigger>
            </TabsList>

            <div className="mt-4">
              <TabsContent value="profile" className="mt-0 animate-in fade-in-50 slide-in-from-bottom-2">
                <PatientProfileTab patient={patient} />
              </TabsContent>

              <TabsContent value="attachments" className="mt-0 animate-in fade-in-50 slide-in-from-bottom-2">
                <PatientAttachmentsTab patientId={patientId} />
              </TabsContent>

              <TabsContent value="visits" className="mt-0 animate-in fade-in-50 slide-in-from-bottom-2">
                <PatientVisitsTable 
                  visits={visits} 
                  isLoading={isVisitsLoading} 
                  patientId={patientId}
                  onVisitAdded={handleVisitAdded}
                />
              </TabsContent>

              <TabsContent value="appointments" className="mt-0 animate-in fade-in-50 slide-in-from-bottom-2">
                <PatientAppointmentsHistory 
                  appointments={appointments} 
                  isLoading={isAppointmentsLoading}
                  patientId={patientId}
                  patient={patient}
                />
              </TabsContent>

              <TabsContent value="plans" className="mt-0 animate-in fade-in-50 slide-in-from-bottom-2">
                <PatientTreatmentPlansTable patientId={patientId} />
              </TabsContent>
            </div>
          </Tabs>

          {/* Dialogs */}
          <PatientEditDialog
            open={isEditDialogOpen}
            onClose={() => setIsEditDialogOpen(false)}
            patient={patient}
          />
          
          {/* Create Visit Dialog - Wrapped in Dialog component to prevent rendering at bottom of page */}
          <Dialog open={isVisitDialogOpen} onOpenChange={setIsVisitDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
              <DialogHeader>
                <DialogTitle>إضافة كشف جديد</DialogTitle>
              </DialogHeader>
              <VisitCreateForm 
                patientId={patientId}
                onSuccess={handleVisitAdded}
                onCancel={() => setIsVisitDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>

          <AppointmentCreateDialog 
            open={isAppointmentDialogOpen}
            onClose={() => setIsAppointmentDialogOpen(false)}
            initialPatient={patient}
          />

          <UploadDialog 
            open={isUploadDialogOpen} 
            onClose={() => setIsUploadDialogOpen(false)} 
            onUpload={handleUpload}
            isUploading={isUploading}
          />

          <PatientTransactionDialog 
            open={isTransactionDialogOpen}
            onOpenChange={setIsTransactionDialogOpen}
            patientId={patientId}
            type={transactionType}
            onSuccess={handleTransactionSuccess}
          />

          <Dialog open={isPlanTemplateDialogOpen} onOpenChange={setIsPlanTemplateDialogOpen}>
            <DialogContent dir="rtl">
              <DialogHeader className="flex flex-row items-center justify-between">
                <DialogTitle>اختر خطة علاجية</DialogTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => setIsPlanTemplateDialogOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogHeader>
              <div className="grid gap-2 py-4">
                {templates?.length > 0 ? (
                  templates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <div className="font-medium">{template.name}</div>
                      <div className="text-sm text-muted-foreground">{template.session_price} ج.م / جلسة</div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    مفيش قوالب خطط علاجية متاحة
                  </div>
                )}
              </div>
              <div className="mt-4 flex justify-end border-t pt-4">
                  <Button variant="outline" onClick={() => setIsPlanTemplateDialogOpen(false)}>إلغاء</Button>
              </div>
            </DialogContent>
          </Dialog>

          <PatientPlanAssignmentForm
            open={isPlanFormOpen}
            onClose={() => setIsPlanFormOpen(false)}
            template={selectedTemplate}
            patientId={patientId}
            onPlanAssigned={handlePlanAssigned}
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
    active: { label: "نشطة", className: "bg-white text-emerald-700 border-emerald-200 dark:bg-slate-950 dark:text-emerald-400 dark:border-emerald-800" },
    completed: { label: "مكتملة", className: "bg-blue-800 text-white font-bold border border-blue-900 shadow-sm dark:bg-blue-600 dark:text-blue-50" },
    cancelled: { label: "ملغية", className: "bg-white text-slate-600 border-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-700" },
  };

  return (
    <div className="space-y-4" style={{ direction: 'rtl' }}>
      {/* Header with Add Button */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-primary" />
          الخطط العلاجية
        </h3>
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1.5 h-8 bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary hover:text-primary" disabled={!patientId}>
              <Plus className="w-3.5 h-3.5" />
              خطة جديدة
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
        <div className="space-y-3">
          {patientPlans.map((plan) => (
            <div
              key={plan.id}
              onClick={() => navigate(`/patients/${patientId}/plans/${plan.id}`)}
              className="cursor-pointer group"
            >
              <Card className="overflow-hidden border-border/50 hover:border-primary/50 hover:shadow-md transition-all duration-300 bg-card/50 hover:bg-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-bold text-base text-foreground">
                          {plan.treatment_templates?.name || "خطة علاجية"}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusConfig[plan.status]?.className || ''}`}>
                          {statusConfig[plan.status]?.label || plan.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5 font-medium">
                          <ClipboardList className="w-3.5 h-3.5" />
                          <span>{plan.total_sessions} جلسات إجمالية</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-medium">
                          <Wallet className="w-3.5 h-3.5" />
                          <span>{plan.total_price} جنيه</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="h-8 w-8 rounded-full bg-muted/50 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                      <Eye className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed border-muted-foreground/20">
          <ClipboardList className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">مفيش خطط علاجية نشطة</p>
        </div>
      )}

      <PatientPlanAssignmentForm
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        template={selectedTemplate}
        patientId={patientId}
        onPlanAssigned={handlePlanAssigned}
      />
    </div>
  );
}
