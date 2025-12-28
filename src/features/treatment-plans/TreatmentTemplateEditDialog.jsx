import React from "react";
import {
  Dialog,
  DialogHeader,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { useForm } from "react-hook-form";
import useUpdateTreatmentTemplate from "./useUpdateTreatmentTemplate";
import TreatmentTemplateForm from "./TreatmentTemplateForm";
import toast from "react-hot-toast";
import { Stethoscope, X, Edit } from "lucide-react";

export default function TreatmentTemplateEditDialog({ open, onClose, template }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm();
  
  const { mutateAsync, isPending } = useUpdateTreatmentTemplate();

  // Set form values when template changes
  React.useEffect(() => {
    if (template && open) {
      setValue("name", template.name);
      setValue("session_price", template.session_price);
      setValue("description", template.description || "");
    }
  }, [template, open, setValue]);

  function handleClose() {
    reset();
    onClose?.();
  }

  async function onSubmit(values) {
    try {
      if (!template?.id) {
        throw new Error("معرف الخطة مفقود");
      }
      
      const payload = {
        name: values.name,
        session_price: parseFloat(values.session_price),
        description: values.description || null,
      };
      
      await mutateAsync({ id: template.id, payload });
      toast.success("تم تحديث الخطة العلاجية بنجاح");
      handleClose();
    } catch (e) {
      console.error("Error updating treatment template:", e);
      toast.error("حدث خطأ أثناء تحديث الخطة العلاجية");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="bg-primary text-white p-6 rounded-t-xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/20">
                <Edit className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  تعديل خطة العلاجية
                </h3>
                <p className="text-primary-foreground/80 text-sm mt-1">قم بتحديث تفاصيل خطة العلاجية</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <TreatmentTemplateForm register={register} errors={errors} />
          <DialogFooter className="mt-6 gap-3">
            <Button 
              variant="outline" 
              onClick={handleClose} 
              type="button"
              className="w-[25%] border-border hover:bg-muted"
            >
              إلغاء
            </Button>
            <Button 
              type="submit" 
              disabled={isPending}
              className="w-[75%] bg-primary hover:bg-primary/90 text-white flex items-center justify-center gap-2"
            >
              {isPending ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  جاري التحديث...
                </div>
              ) : (
                "تحديث الخطة العلاجية"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}