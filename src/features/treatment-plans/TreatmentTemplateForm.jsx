import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Stethoscope, Banknote, FileText } from "lucide-react";

export default function TreatmentTemplateForm({ register, errors }) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium text-foreground flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-primary" />
          <span>اسم الخطة العلاجية</span>
        </Label>
        <Input
          id="name"
          {...register("name", { required: "اسم الخطة العلاجية مطلوب" })}
          placeholder="أدخل اسم الخطة العلاجية"
          className="h-11"
        />
        {errors.name && (
          <p className="text-sm text-destructive mt-1 flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="session_price" className="text-sm font-medium text-foreground flex items-center gap-2">
          <Banknote className="h-4 w-4 text-green-600" />
          <span>سعر الجلسة (جنية مصري)</span>
        </Label>
        <div className="relative">
          <Input
            id="session_price"
            type="number"
            step="0.01"
            min="0"
            {...register("session_price", { 
              required: "سعر الجلسة مطلوب",
              min: { value: 0, message: "سعر الجلسة يجب أن يكون أكبر من أو يساوي صفر" }
            })}
            placeholder="0.00"
            className="h-11 pr-10"
          />
          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">ج.م</span>
        </div>
        {errors.session_price && (
          <p className="text-sm text-destructive mt-1 flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {errors.session_price.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium text-foreground flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span>وصف الخطة العلاجية (اختياري)</span>
        </Label>
        <Textarea
          id="description"
          {...register("description")}
          placeholder="أدخل وصف الخطة العلاجية"
          className="min-h-[120px]"
        />
        <p className="text-xs text-muted-foreground mt-1">يمكنك إضافة تفاصيل إضافية حول هذه الخطة العلاجية</p>
      </div>
    </div>
  );
}