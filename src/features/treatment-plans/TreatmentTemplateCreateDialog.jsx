import { useForm } from "react-hook-form";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "../../components/ui/dialog";
import TreatmentTemplateForm from "./TreatmentTemplateForm";
import useCreateTreatmentTemplate from "./useCreateTreatmentTemplate";
import { Stethoscope, X } from "lucide-react";

export default function TreatmentTemplateCreateDialog({ open, onClose, onTemplateCreated }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();
  const { mutateAsync, isPending } = useCreateTreatmentTemplate();

  function handleClose() {
    reset();
    onClose?.();
  }

  async function onSubmit(values) {
    try {
      const payload = {
        name: values.name,
        session_price: parseFloat(values.session_price),
        description: values.description || null,
      };
      
      const newTemplate = await mutateAsync(payload);
      reset();
      if (onTemplateCreated) {
        onTemplateCreated(newTemplate);
      }
      handleClose();
    } catch (e) {
      console.error("Error creating treatment template:", e);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-xl">
        <DialogHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Stethoscope className="h-6 w-6" />
              إضافة خطة علاجية جديدة
            </h3>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-blue-100 text-sm mt-1">قم بإدخال تفاصيل خطة العلاجية الجديدة</p>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <TreatmentTemplateForm register={register} errors={errors} />
          <DialogFooter className="mt-8 gap-3">
            <Button 
              variant="outline" 
              onClick={onClose} 
              type="button"
              className="border-gray-300 hover:bg-gray-50"
            >
              إلغاء
            </Button>
            <Button 
              type="submit" 
              disabled={isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isPending ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  جاري الإضافة...
                </div>
              ) : (
                "إضافة الخطة العلاجية"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
