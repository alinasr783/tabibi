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
    watch,
  } = useForm();
  
  const { mutateAsync, isPending } = useUpdateTreatmentTemplate();

  // Set form values when template changes
  React.useEffect(() => {
    if (template && open) {
      setValue("name", template.name);
      setValue("session_price", template.session_price);
      setValue("description", template.description || "");
      setValue("advanced_settings.billing.mode", template.advanced_settings?.billing?.mode || "per_session");
      setValue("advanced_settings.billing.bundleSize", template.advanced_settings?.billing?.bundleSize ?? 2);
      setValue("advanced_settings.billing.bundlePrice", template.advanced_settings?.billing?.bundlePrice ?? 0);
      setValue("advanced_settings.paymentPrompt.enabled", !!template.advanced_settings?.paymentPrompt?.enabled);
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

      const advanced = values.advanced_settings || {};
      const mode = advanced?.billing?.mode || "per_session";
      const bundleSize = Number(advanced?.billing?.bundleSize);
      const bundlePrice = Number(advanced?.billing?.bundlePrice);
      
      const payload = {
        name: values.name,
        session_price: parseFloat(values.session_price),
        description: values.description || null,
        advanced_settings: {
          billing: {
            mode,
            bundleSize: Number.isFinite(bundleSize) ? bundleSize : 2,
            bundlePrice: Number.isFinite(bundlePrice) ? bundlePrice : 0,
          },
          paymentPrompt: {
            enabled: !!advanced?.paymentPrompt?.enabled,
          },
        },
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
      <DialogContent className="max-w-lg overflow-y-auto max-h-[90vh]">
        <DialogHeader className="border-b border-border p-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            تعديل الخطة العلاجية
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <TreatmentTemplateForm register={register} errors={errors} setValue={setValue} watch={watch} />
          <DialogFooter className="mt-6 gap-3">
            <Button 
              variant="outline" 
              onClick={handleClose} 
              type="button"
              className="w-[25%]"
            >
              إلغاء
            </Button>
            <Button 
              type="submit" 
              disabled={isPending}
              className="w-[75%] flex items-center justify-center gap-2"
            >
              {isPending ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
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
