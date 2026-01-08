import { Dialog, DialogHeader, DialogContent, DialogFooter } from "../../components/ui/dialog"
import { Button } from "../../components/ui/button"
import { useForm } from "react-hook-form"
import PatientForm from "./PatientForm"
import useUpdatePatient from "./useUpdatePatient"
import toast from "react-hot-toast"

export default function PatientEditDialog({ open, onClose, patient }) {
  const { register, control, handleSubmit, formState: { errors } } = useForm()
  const { mutateAsync, isPending } = useUpdatePatient()

  // Helper to calculate age from DOB if age is missing
  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const birthDate = new Date(dateOfBirth);
    return Math.floor((new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
  };

  const formDefaultValues = {
    ...patient,
    age: patient?.age ?? calculateAge(patient?.date_of_birth)
  };

  async function onSubmit(values) {
    try {
      // Handle age and age_unit
      let age = null;
      if (values.age && values.age !== "") {
        age = parseInt(values.age, 10);
      }

      const payload = {
        name: values.name,
        phone: values.phone || null,
        gender: values.gender,
        address: values.address || null,
        age: age,
        age_unit: values.age_unit || "years",
        date_of_birth: null, // Clear DOB to prioritize Age since we are editing Age
        blood_type: values.blood_type || null,
      }
      await mutateAsync({ id: patient.id, values: payload })
      toast.success("تم تحديث بيانات المريض")
      onClose?.()
    } catch (e) {
      console.error("Error updating patient:", e);
      toast.error("حدث خطأ أثناء التحديث")
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <h3 className="text-lg font-semibold">تعديل بيانات المريض</h3>
        </DialogHeader>
        <form id="edit-patient-form" onSubmit={handleSubmit(onSubmit)}>
          <PatientForm defaultValues={formDefaultValues} register={register} control={control} errors={errors} />
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="w-[25%]">إلغاء</Button>
          <Button form="edit-patient-form" type="submit" disabled={isPending} className="w-[75%]">حفظ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

