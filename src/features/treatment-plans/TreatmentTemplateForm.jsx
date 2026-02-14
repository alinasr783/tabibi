import { useEffect, useState } from "react";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Stethoscope, Banknote, FileText } from "lucide-react";
import { Switch } from "../../components/ui/switch";
import { Separator } from "../../components/ui/separator";

export default function TreatmentTemplateForm({ register, errors, setValue, watch }) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const billingMode = watch?.("advanced_settings.billing.mode") || "per_session";
  const paymentPromptEnabled = !!watch?.("advanced_settings.paymentPrompt.enabled");

  useEffect(() => {
    if (!setValue) return;
    setValue("advanced_settings.billing.mode", billingMode || "per_session", { shouldDirty: false });
    if (watch?.("advanced_settings.billing.bundleSize") == null) {
      setValue("advanced_settings.billing.bundleSize", 2, { shouldDirty: false });
    }
    if (watch?.("advanced_settings.billing.bundlePrice") == null) {
      setValue("advanced_settings.billing.bundlePrice", 0, { shouldDirty: false });
    }
    if (watch?.("advanced_settings.paymentPrompt.enabled") == null) {
      setValue("advanced_settings.paymentPrompt.enabled", false, { shouldDirty: false });
    }
  }, [setValue]);

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

      <Separator />

      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="text-sm font-semibold text-foreground">الإعدادات المتقدمة</div>
          <div className="text-xs text-muted-foreground">خاصة بهذه الخطة العلاجية</div>
        </div>
        <Switch checked={showAdvanced} onCheckedChange={setShowAdvanced} />
      </div>

      {showAdvanced ? (
        <div className="space-y-4 rounded-[var(--radius)] border border-border p-4 bg-muted/10">
          <div className="space-y-2">
            <Label>طريقة إضافة المستحقات</Label>
            <select
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={billingMode}
              onChange={(e) => setValue?.("advanced_settings.billing.mode", e.target.value, { shouldDirty: true })}
            >
              <option value="per_session">كل جلسة بسعرها</option>
              <option value="bundle">كل عدد جلسات بسعر</option>
            </select>
          </div>

          {billingMode === "bundle" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>عدد الجلسات في الباقة</Label>
                <Input
                  type="number"
                  min="1"
                  {...register("advanced_settings.billing.bundleSize")}
                />
              </div>
              <div className="space-y-2">
                <Label>سعر الباقة (جنيه)</Label>
                <Input
                  type="number"
                  min="0"
                  {...register("advanced_settings.billing.bundlePrice")}
                />
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="text-sm font-semibold text-foreground">إظهار مودال دفع بعد الجلسة</div>
              <div className="text-xs text-muted-foreground">على مستوى هذه الخطة فقط</div>
            </div>
            <Switch
              checked={paymentPromptEnabled}
              onCheckedChange={(v) => setValue?.("advanced_settings.paymentPrompt.enabled", v, { shouldDirty: true })}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
