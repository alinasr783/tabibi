import { ArrowLeft, Eye, Phone, MapPin, Cake, Droplets, Calendar, Wallet, FileText, Stethoscope, User, MessageCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import PatientEditDialog from "./PatientEditDialog";
import { SkeletonLine, SkeletonBlock } from "../../components/ui/skeleton";
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
import DataTable from "../../components/ui/table";
import usePatientFinancialData from "./usePatientFinancialData";

export default function PatientDetailPage() {
  const { id: patientId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Apply scroll to top on route changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const { data: patient, isLoading: isPatientLoading } = usePatient(patientId);
  const { data: financialData, isLoading: isFinancialLoading } = usePatientFinancialData(patientId);
  const { data: visits, isLoading: isVisitsLoading } = useVisits(patientId);
  const { data: appointments, isLoading: isAppointmentsLoading } = usePatientAppointments(patientId);

  const handleVisitAdded = () => {
    // Invalidate visits query to refresh the data
    queryClient.invalidateQueries({ queryKey: ["visits", patientId] });
  };

  // Calculate patient age
  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return "-";
    const birthDate = new Date(dateOfBirth);
    const age = Math.floor((new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
    return `${age} سنة`;
  };

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
    <div className="space-y-8" dir="rtl">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">ملف المريض</h1>
            <p className="text-sm text-muted-foreground mt-1">
              عرض تفاصيل المريض وسجل الزيارات والخطط العلاجية
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(true)}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              تعديل البيانات
            </Button>
            
            <Button
              variant="ghost"
              className="gap-2"
              onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
              رجوع
            </Button>
          </div>
        </div>
      </div>

      {isPatientLoading ? (
        <Card>
          <CardHeader>
            <SkeletonLine width={180} height={20} />
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              {Array.from({length: 5}).map((_, i) => (
                <div
                  key={i}
                  className="rounded-[var(--radius)] border border-border p-3">
                  <SkeletonLine width={100} height={12} />
                  <div className="mt-2">
                    <SkeletonLine height={16} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6 pb-20 md:pb-0">
          {/* Basic Info Card */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                المعلومات الأساسية
              </h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{patient?.name}</h4>
                    <p className="text-sm text-muted-foreground">الاسم الكامل</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Phone className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{patient?.phone || "-"}</h4>
                    <p className="text-sm text-muted-foreground">رقم الهاتف</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Cake className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{calculateAge(patient?.date_of_birth)}</h4>
                    <p className="text-sm text-muted-foreground">العمر</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{patient?.address || "-"}</h4>
                    <p className="text-sm text-muted-foreground">العنوان</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {patient?.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString('ar-EG') : "-"}
                    </h4>
                    <p className="text-sm text-muted-foreground">تاريخ الميلاد</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary Card */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Wallet className="h-5 w-5 text-green-600" />
                الملخص المالي
              </h3>
            </CardHeader>
            <CardContent>
              {isFinancialLoading ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-20 bg-gray-100 rounded animate-pulse"></div>
                    ))}
                  </div>
                  <div className="h-32 bg-gray-100 rounded animate-pulse mt-4"></div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                      <div className="text-sm text-green-700 mb-1">إجمالي المبلغ</div>
                      <div className="text-2xl font-bold text-green-900">{financialData?.totalAmount.toFixed(2) || "0.00"} جنيه</div>
                    </div>
                    
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                      <div className="text-sm text-blue-700 mb-1">المدفوع</div>
                      <div className="text-2xl font-bold text-blue-900">{financialData?.paidAmount.toFixed(2) || "0.00"} جنيه</div>
                    </div>
                    
                    <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
                      <div className="text-sm text-orange-700 mb-1">المتبقي</div>
                      <div className="text-2xl font-bold text-orange-900">{financialData?.remainingAmount.toFixed(2) || "0.00"} جنيه</div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-border">
                    <h4 className="font-medium mb-3">سجل المدفوعات</h4>
                    {financialData?.paymentHistory && financialData.paymentHistory.length > 0 ? (
                      <div className="space-y-3">
                        {financialData.paymentHistory.map((payment, index) => (
                          <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div>
                              <div className="font-medium">{payment.method}</div>
                              <div className="text-sm text-muted-foreground">
                                {payment.date ? new Date(payment.date).toLocaleDateString('ar-EG') : "-"}
                              </div>
                            </div>
                            <div className="font-bold text-green-600">{payment.amount.toFixed(2)} جنيه</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        لا توجد مدفوعات مسجلة
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Appointments History */}
          <PatientAppointmentsHistory 
            appointments={appointments} 
            isLoading={isAppointmentsLoading} 
          />

          {/* Treatment Visits */}
          <PatientVisitsTable 
            visits={visits} 
            isLoading={isVisitsLoading} 
            patientId={patientId}
            onVisitAdded={handleVisitAdded}
          />

          {/* Treatment Plans */}
          <PatientTreatmentPlansTable patientId={patientId} />
          
          {/* Medical Notes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-purple-600" />
                  الملاحظات الطبية
                </h3>
                {/* WhatsApp Share Button - Only show if there are visits with medications */}
                {visits && visits.some(visit => 
                  visit.medications && Array.isArray(visit.medications) && visit.medications.length > 0
                ) && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={shareLatestPrescription}
                    className="gap-2"
                  >
                    <MessageCircle className="h-4 w-4" />
                    مشاركة آخر وصفة عبر واتساب
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium">ملاحظة طبية</div>
                    <div className="text-sm text-muted-foreground">10 يونيو 2024</div>
                  </div>
                  <p className="text-gray-700">المريض يشكو من آلام في السن العلوي الأيسر. تم إجراء فحص شامل وتم تشخيص التهاب لثة.</p>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium">ملاحظة سريرية</div>
                    <div className="text-sm text-muted-foreground">5 يونيو 2024</div>
                  </div>
                  <p className="text-gray-700">تم إعطاء المريض مضاد حيوي ومسكن للألم. يجب مراجعة العيادة بعد أسبوع.</p>
                </div>
              </div>
              
              <div className="mt-4">
                <Button variant="outline" className="gap-2">
                  <FileText className="h-4 w-4" />
                  إضافة ملاحظة جديدة
                </Button>
              </div>
            </CardContent>
          </Card>

          <PatientEditDialog
            open={isEditDialogOpen}
            onClose={() => setIsEditDialogOpen(false)}
            patient={patient}
          />
        </div>
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
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setIsFormOpen(true);
    setIsOpen(false); // Close dropdown
  };

  const handlePlanAssigned = () => {
    // Refresh patient plans
    refetch();
  };

  // Define columns for the patient plans table
  const columns = [
    {
      header: "اسم الخطة",
      accessor: "treatment_template_name",
      render: (plan) => plan.treatment_templates?.name || "-",
    },
    {
      header: "عدد الجلسات",
      accessor: "total_sessions",
    },
    {
      header: "السعر الإجمالي",
      accessor: "total_price",
      render: (plan) => `${plan.total_price} جنيه`,
    },
    {
      header: "الحالة",
      accessor: "status",
      render: (plan) => {
        const statusMap = {
          active: "نشطة",
          completed: "مكتملة",
          cancelled: "ملغية",
        };
        return statusMap[plan.status] || plan.status;
      },
    },
    {
      header: "",
      render: (plan) => (
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate(`/patients/${patientId}/plans/${plan.id}`)}
        >
          <Eye className="h-4 w-4 ml-2" />
          عرض التفاصيل
        </Button>
      ),
    },
  ];

  // Pagination logic
  const PATIENT_DETAIL_PAGE_SIZE = 4;
  const startIndex = (currentPage - 1) * PATIENT_DETAIL_PAGE_SIZE;
  const endIndex = startIndex + PATIENT_DETAIL_PAGE_SIZE;
  const paginatedPlans = patientPlans?.slice(startIndex, endIndex) || [];
  const totalPages = Math.ceil((patientPlans?.length || 0) / PATIENT_DETAIL_PAGE_SIZE);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">الخطط العلاجية</h3>
            <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
              <DropdownMenuTrigger asChild>
                <Button>
                  إضافة خطة
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                {isTemplatesLoading ? (
                  <DropdownMenuItem>
                    <div className="w-full flex justify-center">
                      <div className="h-2 w-24 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </DropdownMenuItem>
                ) : templates && templates.length > 0 ? (
                  templates.map((template) => (
                    <DropdownMenuItem 
                      key={template.id} 
                      className="flex flex-col items-start p-3 cursor-pointer"
                      onSelect={() => handleTemplateSelect(template)}
                    >
                      <div className="font-medium">{template.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {template.session_price} جنيه للجلسة
                      </div>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>
                    <div className="text-center w-full text-sm text-muted-foreground">
                      لا توجد خطط علاجية متوفرة
                    </div>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          {isPlansLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
              ))}
            </div>
          ) : patientPlans && patientPlans.length > 0 ? (
            <>
              <DataTable
                columns={columns}
                data={paginatedPlans}
                emptyLabel="لا توجد خطط علاجية لهذا المريض"
                page={currentPage}
                pageSize={PATIENT_DETAIL_PAGE_SIZE}
                total={patientPlans?.length || 0}
                onPageChange={setCurrentPage}
              />
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border px-3 py-2 mt-4">
                  <div className="text-xs text-muted-foreground">
                    {startIndex + 1}-{Math.min(endIndex, patientPlans.length)} من {patientPlans.length}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      className="px-2 py-1 rounded-[var(--radius)] bg-muted text-xs disabled:opacity-50"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(prev => prev - 1)}
                    >
                      السابق
                    </button>
                    <span className="px-2 py-1 rounded-[var(--radius)] bg-muted text-xs">
                      الصفحة {currentPage} من {totalPages}
                    </span>
                    <button
                      className="px-2 py-1 rounded-[var(--radius)] bg-muted text-xs disabled:opacity-50"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(prev => prev + 1)}
                    >
                      التالي
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد خطط علاجية لهذا المريض
            </div>
          )}
        </CardContent>
      </Card>

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
