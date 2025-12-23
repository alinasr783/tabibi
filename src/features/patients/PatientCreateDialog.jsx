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
import { ScrollArea } from "../../components/ui/scroll-area";
import PatientForm from "./PatientForm";
import useCreatePatientOffline from "./useCreatePatientOffline";

export default function PatientCreateDialog({open, onClose, onPatientCreated, clinicId}) {
  const {
    register,
    handleSubmit,
    formState: {errors},
    reset,
  } = useForm();
  
  const {mutateAsync, isPending} = useCreatePatientOffline();
  
  async function onSubmit(values) {
    try {
      // Handle date of birth properly
      let dateOfBirth = null;
      if (values.date_of_birth && values.date_of_birth !== "") {
        dateOfBirth = values.date_of_birth;
      }
      
      const payload = {
        name: values.name,
        phone: values.phone || null,
        gender: values.gender,
        address: values.address || null,
        date_of_birth: dateOfBirth,
        blood_type: values.blood_type || null,
        clinic_id: clinicId
      };
      
      // Log the payload for debugging
      console.log("Patient creation payload:", payload);
      
      const newPatient = await mutateAsync(payload);
      toast.success("تم إضافة المريض بنجاح");
      reset();
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
    <Dialog open={open} onOpenChange={onClose}  style={{ direction: 'rtl' }}>
      <DialogContent className="sm:max-w-[500px] w-[95vw] max-h-[90vh] h-auto p-0 rounded-xl border-0 shadow-2xl" dir="rtl">
        {/* Header */}
        <DialogHeader className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold text-gray-900" style={{ direction: 'rtl' }}>
              إضافة مريض جديد
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 max-h-[calc(90vh-80px)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <PatientForm register={register} errors={errors} />
            
            {/* أزرار الإجراءات */}
            <div className="flex gap-3 pt-4" style={{ direction: 'rtl' }}>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 border-gray-300 hover:bg-gray-50 h-11"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="flex-1 bg-primary hover:bg-primary/90 h-11"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin ml-2" style={{ direction: 'rtl' }} />
                    جاري الإضافة...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 ml-2" style={{ direction: 'rtl' }} />
                    إضافة المريض
                  </>
                )} 
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}