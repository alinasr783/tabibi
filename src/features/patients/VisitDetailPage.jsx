import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
    ArrowLeft,
    Calendar,
    Edit,
    FileText,
    MessageCircle,
    Pill,
    Printer,
    Stethoscope,
    X,
    Plus
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
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
import generatePrescriptionPdfNew from "../../lib/generatePrescriptionPdfNew";
import { useAuth } from "../auth/AuthContext";
import useClinic from "../auth/useClinic";
import usePlan from "../auth/usePlan";
import useUpdateVisit from "./useUpdateVisit";
import useVisit from "./useVisit";

export default function VisitDetailPage() {
  const {visitId} = useParams();
  const {data: visit, isLoading, error} = useVisit(visitId);
  const {data: clinic} = useClinic();
  const {user} = useAuth();
  const {data: planData} = usePlan();
  const navigate = useNavigate();
  const {mutate: updateVisit, isPending: isUpdating} = useUpdateVisit();
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [isFeatureRestrictedModalOpen, setIsFeatureRestrictedModalOpen] =
    useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDiagnosisEditModalOpen, setIsDiagnosisEditModalOpen] = useState(false);
  const [isNotesEditModalOpen, setIsNotesEditModalOpen] = useState(false);
  const [isMedicationsEditModalOpen, setIsMedicationsEditModalOpen] = useState(false);
  const [editData, setEditData] = useState({
    diagnosis: "",
    notes: "",
    medications: [],
  });

  // Check if WhatsApp feature is enabled in the plan
  const isWhatsAppEnabled =
    planData?.plans?.limits?.features?.whatsapp === true;

  // Initialize edit data when visit loads
  useEffect(() => {
    if (visit && !editData.diagnosis) {
      setEditData({
        diagnosis: visit.diagnosis || "",
        notes: visit.notes || "",
        medications: visit.medications ? [...visit.medications] : [],
      });
    }
  }, [visit]);

  const openEditModal = () => {
    // Initialize edit data with current visit data
    setEditData({
      diagnosis: visit?.diagnosis || "",
      notes: visit?.notes || "",
      medications: visit?.medications ? [...visit.medications] : [],
    });
    setIsEditModalOpen(true);
  };

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

  const handleSaveEdit = () => {
    updateVisit(
      {id: visitId, ...editData},
      {
        onSuccess: () => {
          setIsEditModalOpen(false);
          // Refresh the visit data
          window.location.reload();
        },
        onError: (error) => {
          alert("حدث خطأ أثناء تحديث بيانات الكشف: " + error.message);
        },
      }
    );
  };

  const openDiagnosisEditModal = () => {
    setEditData({
      diagnosis: visit?.diagnosis || "",
      notes: visit?.notes || "",
      medications: visit?.medications ? [...visit.medications] : [],
    });
    setIsDiagnosisEditModalOpen(true);
  };

  const openNotesEditModal = () => {
    setEditData({
      diagnosis: visit?.diagnosis || "",
      notes: visit?.notes || "",
      medications: visit?.medications ? [...visit.medications] : [],
    });
    setIsNotesEditModalOpen(true);
  };

  const openMedicationsEditModal = () => {
    setEditData({
      diagnosis: visit?.diagnosis || "",
      notes: visit?.notes || "",
      medications: visit?.medications ? [...visit.medications] : [],
    });
    setIsMedicationsEditModalOpen(true);
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
    if (visit && clinic && user) {
      try {
        await generatePrescriptionPdfNew(
          visit,
          user.name,
          clinic.name,
          clinic.address,
          false, // shareViaWhatsApp
          planData // Pass plan data for watermark feature
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

  const openWhatsAppModal = () => {
    // If WhatsApp is not enabled in the plan, show a modal and return
    if (!isWhatsAppEnabled) {
      setIsFeatureRestrictedModalOpen(true);
      return;
    }

    // Pre-fill with patient's phone number if available
    if (visit && visit.patient?.phone) {
      setWhatsappNumber(visit.patient.phone);
    }
    setIsWhatsAppModalOpen(true);
  };

  const handleWhatsAppShare = () => {
    if (!visit) {
      alert("لا توجد بيانات الكشف لمشاركتها");
      return;
    }

    // Format phone number for WhatsApp (remove any non-digit characters and add country code if needed)
    let formattedPhone = whatsappNumber.replace(/\D/g, "");

    // Assuming Egyptian phone numbers, add country code if not present
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "2" + formattedPhone;
    } else if (!formattedPhone.startsWith("20")) {
      formattedPhone = "20" + formattedPhone;
    }

    // Create formatted medications list
    let medicationsList = "";
    if (
      visit.medications &&
      Array.isArray(visit.medications) &&
      visit.medications.length > 0
    ) {
      medicationsList = visit.medications
        .map(
          (med, index) =>
            `${index + 1}. ${med.name || ""}\n   ${med.using || ""}`
        )
        .join("\n\n");
    } else {
      medicationsList = "لا توجد أدوية محددة";
    }

    // Create WhatsApp message with only medications and welcome message
    const message = `*مرحباً بك في عيادة ${clinic?.name || "الطبيب"}*
        
نرجو منك الالتزام بالتعليمات التالية:

${medicationsList}

*تاريخ الزيارة:* ${
      visit.created_at
        ? new Date(visit.created_at).toLocaleDateString("ar-EG")
        : "غير محدد"
    }

نشكرك على ثقتك بعيادتنا!`;

    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);

    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;

    // Close modal and open WhatsApp in new tab
    setIsWhatsAppModalOpen(false);
    window.open(whatsappUrl, "_blank");
  };

  if (isLoading) {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted animate-pulse"></div>
            <div className="space-y-2">
              <SkeletonLine width={150} height={20} />
              <SkeletonLine width={100} height={14} />
            </div>
          </div>
          <SkeletonLine width={80} height={36} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse"></div>
          ))}
        </div>
        <div className="h-32 bg-muted rounded-lg animate-pulse"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">تفاصيل الكشف</h1>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
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

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Stethoscope className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold">تفاصيل الكشف</h1>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
              <Calendar className="w-3.5 h-3.5" />
              {visit?.created_at
                ? format(new Date(visit.created_at), "d MMMM yyyy - h:mm a", { locale: ar })
                : "غير محدد"
              }
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={openDiagnosisEditModal} className="gap-1.5">
            <Edit className="w-4 h-4" />
            عدل التشخيص
          </Button>
          <Button variant="outline" size="sm" onClick={openNotesEditModal} className="gap-1.5">
            <Edit className="w-4 h-4" />
            عدل الملاحظات
          </Button>
          <Button variant="outline" size="sm" onClick={openMedicationsEditModal} className="gap-1.5">
            <Edit className="w-4 h-4" />
            عدل الأدوية
          </Button>
          {visit?.medications && visit.medications.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={openWhatsAppModal} className="gap-1.5">
                <MessageCircle className="w-4 h-4" />
                واتساب
              </Button>
              <Button variant="outline" size="sm" onClick={handleGeneratePdf} className="gap-1.5">
                <Printer className="w-4 h-4" />
                طباعة
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            رجوع
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Diagnosis */}
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2 text-muted-foreground mb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="text-xs font-medium">التشخيص</span>
              </div>
              <Button variant="ghost" size="sm" onClick={openDiagnosisEditModal} className="h-6 w-6 p-1">
                <Edit className="w-3 h-3" />
              </Button>
            </div>
            <p className="text-sm">{visit?.diagnosis || "لا يوجد"}</p>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2 text-muted-foreground mb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="text-xs font-medium">ملاحظات</span>
              </div>
              <Button variant="ghost" size="sm" onClick={openNotesEditModal} className="h-6 w-6 p-1">
                <Edit className="w-3 h-3" />
              </Button>
            </div>
            <p className="text-sm whitespace-pre-wrap">{visit?.notes || "لا يوجد"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Medications */}
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
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-primary">{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{medication.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{medication.using}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">لا توجد أدوية</p>
          )}
        </CardContent>
      </Card>

      {/* WhatsApp Modal */}
      <Dialog open={isWhatsAppModalOpen} onOpenChange={setIsWhatsAppModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>إرسال عبر واتساب</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="phone">رقم الهاتف</Label>
              <Input
                id="phone"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="01xxxxxxxxx"
                className="text-left"
                dir="ltr"
              />
              {visit?.patient?.phone && (
                <p className="text-xs text-muted-foreground">
                  رقم المريض: {visit.patient.phone}
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsWhatsAppModalOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleWhatsAppShare} disabled={!whatsappNumber.trim()}>
              إرسال
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feature Restricted Modal */}
      <Dialog open={isFeatureRestrictedModalOpen} onOpenChange={setIsFeatureRestrictedModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ميزة غير متاحة</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">
            خطتك الحالية مش بتدعم الواتساب. لو عايز الميزة دي، رقي خطتك.
          </p>
          <DialogFooter>
            <Button onClick={() => setIsFeatureRestrictedModalOpen(false)}>
              تمام
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diagnosis Edit Modal */}
      <Dialog open={isDiagnosisEditModalOpen} onOpenChange={setIsDiagnosisEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل التشخيص</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="diagnosis" className="mb-2 block">التشخيص</Label>
            <Textarea
              id="diagnosis"
              value={editData.diagnosis}
              onChange={(e) => handleEditChange("diagnosis", e.target.value)}
              placeholder="التشخيص المبدئي"
              rows={4}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDiagnosisEditModalOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSaveDiagnosis} disabled={isUpdating}>
              {isUpdating ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes Edit Modal */}
      <Dialog open={isNotesEditModalOpen} onOpenChange={setIsNotesEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل الملاحظات</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="notes" className="mb-2 block">ملاحظات</Label>
            <Textarea
              id="notes"
              value={editData.notes}
              onChange={(e) => handleEditChange("notes", e.target.value)}
              placeholder="ملاحظات إضافية"
              rows={4}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsNotesEditModalOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSaveNotes} disabled={isUpdating}>
              {isUpdating ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Medications Edit Modal */}
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
            <div className="flex gap-2 w-full">
              <Button className="flex-[3]" onClick={handleSaveMedications} disabled={isUpdating}>
                {isUpdating ? "جاري الحفظ..." : "حفظ"}
              </Button>
              <Button className="flex-1" variant="outline" onClick={() => setIsMedicationsEditModalOpen(false)}>
                إلغاء
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
