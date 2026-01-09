import { X, Loader2, Check } from "lucide-react";
import { useForm } from "react-hook-form";
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
  
  async function onSubmit(values, attachments, attachmentDescriptions) {
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
      
      // Log the payload for debugging
      console.log("Patient creation payload:", payload);
      
      const newPatient = await mutateAsync(payload);
      
      // Handle attachments if any
      if (attachments && attachments.length > 0) {
        const uploadPromises = attachments.map((file, idx) => 
          uploadPatientAttachment({
            patientId: newPatient.id,
            clinicId: clinicId,
            file: file,
            category: 'initial_upload',
            description: attachmentDescriptions?.[idx] || 'ملف تم رفعه أثناء إنشاء المريض'
          })
        );
        
        await Promise.all(uploadPromises);
      }

      toast.success("تم إضافة المريض بنجاح");
      if (onPatientCreated) {
        onPatientCreated(newPatient);
      }
      onClose?.();
    } catch (e) {
      console.error("Error creating patient:", e);
      toast.error(e.message || "حدث خطأ أثناء إضافة المريض");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose} style={{ direction: 'rtl' }}>
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