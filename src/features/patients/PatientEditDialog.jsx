import { Dialog, DialogHeader, DialogContent, DialogFooter, DialogTitle } from "../../components/ui/dialog"
import { Button } from "../../components/ui/button"
import { useForm } from "react-hook-form"
import PatientWizardForm from "./PatientWizardForm"
import useUpdatePatient from "./useUpdatePatient"
import toast from "react-hot-toast"
import { uploadPatientAttachment } from "../../services/apiAttachments"
import { X } from "lucide-react"

export default function PatientEditDialog({ open, onClose, patient }) {
  const { mutateAsync, isPending } = useUpdatePatient()

  // Helper to calculate age from DOB if age is missing
  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const birthDate = new Date(dateOfBirth);
    return Math.floor((new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
  };

  const initialData = {
    ...patient,
    age: patient?.age ?? calculateAge(patient?.date_of_birth)
  };

  async function onSubmit(values, attachments) {
    try {
      // Handle age and age_unit
      let age = null;
      if (values.age && values.age !== "") {
        age = parseInt(values.age, 10);
      }

      const payload = {
        ...values,
        age: age,
        date_of_birth: null, // Clear DOB to prioritize Age since we are editing Age
      }
      
      await mutateAsync({ id: patient.id, values: payload })

      // Handle attachments if any
      if (attachments && attachments.length > 0) {
        const uploadPromises = attachments.map(file => 
          uploadPatientAttachment({
            patientId: patient.id,
            clinicId: patient.clinic_id, // Assuming patient object has clinic_id
            file: file,
            category: 'initial_upload',
            description: 'Uploaded during patient update'
          })
        );
        
        await Promise.all(uploadPromises);
      }

      toast.success("تم تحديث بيانات المريض")
      onClose?.()
    } catch (e) {
      console.error("Error updating patient:", e);
      toast.error("حدث خطأ أثناء التحديث")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose} style={{ direction: 'rtl' }}>
      <DialogContent className="sm:max-w-[700px] w-[95vw] max-h-[90vh] h-auto p-0 rounded-[var(--radius)] border-0 shadow-2xl overflow-hidden" dir="rtl">
        <DialogHeader className="p-4 bg-white sticky top-0 z-10 border-b flex flex-row items-center justify-between">
          <DialogTitle className="text-lg font-semibold">تعديل بيانات المريض</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-[var(--radius)] hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </Button>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6 max-h-[calc(90vh-80px)]">
          <PatientWizardForm 
            initialData={initialData} 
            onSubmit={onSubmit} 
            isSubmitting={isPending}
            onCancel={onClose}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

