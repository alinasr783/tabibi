import { X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import PatientWizardForm from "./PatientWizardForm";
import useCreatePatientOffline from "./useCreatePatientOffline";
import { uploadPatientAttachment } from "../../services/apiAttachments";

export default function PatientCreateDialog({open, onClose, onPatientCreated, clinicId}) {
  const {mutateAsync, isPending} = useCreatePatientOffline();
  
  async function onSubmit(values, attachments, attachmentDescriptions, attachmentTypes) {
    const browserOffline = typeof navigator !== "undefined" && navigator.onLine === false;
    const safeKeys = values && typeof values === "object" ? Object.keys(values).sort() : [];
    const attachmentsCount = Array.isArray(attachments) ? attachments.length : 0;
    const hasClinicId = !!clinicId;
    console.groupCollapsed("[PATIENT_CREATE] submit");
    console.log("[PATIENT_CREATE] browserOffline:", browserOffline, "hasClinicId:", hasClinicId, "attachmentsCount:", attachmentsCount);
    console.log("[PATIENT_CREATE] valuesKeys:", safeKeys);
    try {
      // Handle age and age_unit
      let age = null;
      if (values.age && values.age !== "") {
        age = parseInt(values.age, 10);
      }

      const payload = {
        ...values,
        age: age,
        clinic_id: clinicId
      };
      
      console.log("[PATIENT_CREATE] mutateAsync start");
      const newPatient = await mutateAsync(payload);
      const createdId = newPatient?.id;
      const isLocal = String(createdId || "").startsWith("local_");
      console.log("[PATIENT_CREATE] mutateAsync done", { id: createdId, isLocal });
      
      toast.success("تم إضافة المريض بنجاح");
      if (onPatientCreated) {
        console.log("[PATIENT_CREATE] onPatientCreated");
        onPatientCreated(newPatient);
      }
      onClose?.();

      if (attachmentsCount > 0) {
        if (browserOffline || isLocal) {
          console.warn("[PATIENT_CREATE] skipping attachments upload (offline/local patient)");
          toast("تم حفظ المريض بدون رفع المرفقات (سيتم رفعها عند الاتصال)");
          return;
        }

        console.log("[PATIENT_CREATE] uploading attachments start", { count: attachmentsCount });
        try {
          const uploadPromises = attachments.map((file, idx) => {
            const category = attachmentTypes?.[idx] || "report";
            const description = attachmentDescriptions?.[idx] || "ملف تم رفعه أثناء إنشاء المريض";
            console.log("[PATIENT_CREATE] uploading attachment", { idx, category, hasFile: !!file });
            return uploadPatientAttachment({
              patientId: createdId,
              clinicId: clinicId,
              file: file,
              category,
              description
            });
          });
          await Promise.all(uploadPromises);
          console.log("[PATIENT_CREATE] uploading attachments done");
        } catch (e) {
          console.error("[PATIENT_CREATE] attachments upload failed (patient already created)", e);
          toast("تم إضافة المريض، لكن فشل رفع المرفقات");
        }
      }
    } catch (e) {
      console.error("Error creating patient:", e);
      toast.error(e.message || "حدث خطأ أثناء إضافة المريض");
    } finally {
      console.groupEnd();
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose?.();
      }}
      style={{ direction: 'rtl' }}
    >
      <DialogContent className="sm:max-w-[700px] w-[95vw] max-h-[90vh] h-auto p-0 rounded-[var(--radius)] border-0 shadow-2xl overflow-hidden" dir="rtl">
        {/* Header */}
        <DialogHeader className="p-4 bg-white sticky top-0 z-10 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold text-gray-900" style={{ direction: 'rtl' }}>
              إضافة مريض جديد
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-[var(--radius)] hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 max-h-[calc(90vh-80px)]">
          <PatientWizardForm onSubmit={onSubmit} isSubmitting={isPending} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
