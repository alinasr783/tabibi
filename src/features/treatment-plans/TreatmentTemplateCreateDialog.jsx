import { useForm } from "react-hook-form";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
    setValue,
    watch,
  } = useForm();
  const { mutateAsync, isPending } = useCreateTreatmentTemplate();

  function handleClose() {
    reset();
    onClose?.();
  }

  async function onSubmit(values) {
    try {
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
      <DialogContent className="max-w-lg p-0 overflow-y-auto max-h-[90vh] gap-0">
        <DialogHeader className="p-6 pb-4 border-b border-border bg-background">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <Stethoscope className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-xl font-bold text-foreground">
                  إضافة خطة علاجية
                </DialogTitle>
                <p className="text-muted-foreground text-sm">
                  قم بإضافة خطة علاجية جديدة لقائمة خدماتك
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleClose}
              className="text-muted-foreground hover:bg-muted -mt-2 -ml-2"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="p-6">
            <TreatmentTemplateForm register={register} errors={errors} setValue={setValue} watch={watch} />
          </div>
          <DialogFooter className="p-6 pt-0 gap-3">
            <Button 
              variant="outline" 
              onClick={onClose} 
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
