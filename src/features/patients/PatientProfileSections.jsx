import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { 
  Briefcase, MapPin, Heart, Shield, Activity, FileText, AlertTriangle, 
  Droplet, Scissors, Users, Mail, Phone, User, Edit, Check, X, Save
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { TagInput } from "../../components/ui/tag-input";
import { Checkbox } from "../../components/ui/checkbox";
import { Switch } from "../../components/ui/switch";
import { Progress } from "../../components/ui/progress";
import { updatePatient } from "../../services/apiPatients";
import toast from "react-hot-toast";
import { useUserPreferences } from "../../hooks/useUserPreferences";
import { flattenCustomFieldTemplates, mergeTemplatesIntoCustomFields, normalizeMedicalFieldsConfig } from "../../lib/medicalFieldsConfig";

// --- Shared Components ---

function ActionButtons({ onSave, onCancel, isSubmitting }) {
  return (
    <div className="flex gap-2 mt-6 pt-4 border-t">
      <Button 
        type="button" 
        onClick={onSave} 
        disabled={isSubmitting}
        className="w-[75%]"
      >
        {isSubmitting ? "جاري الحفظ..." : "حفظ التغييرات"}
        <Save className="w-4 h-4 mr-2" />
      </Button>
      <Button 
        type="button" 
        variant="outline" 
        onClick={onCancel}
        className="w-[25%] border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
      >
        إلغاء
        <X className="w-4 h-4 mr-2" />
      </Button>
    </div>
  );
}

// --- Personal Data Section ---

export function PersonalDataForm({ patient, onCancel, onSuccess }) {
  const { data: preferences } = useUserPreferences();
  const medicalFieldsConfig = useMemo(
    () => normalizeMedicalFieldsConfig(preferences?.medical_fields_config),
    [preferences?.medical_fields_config]
  );
  const personalCfg = medicalFieldsConfig.patient.fields.personal;

  const { register, control, handleSubmit, formState: { isSubmitting, errors } } = useForm({
    defaultValues: {
      job: patient.job || "",
      marital_status: patient.marital_status || "",
      address: patient.address || "",
      phone: patient.phone || "",
      email: patient.email || "",
      blood_type: patient.blood_type || ""
    }
  });

  const onSubmit = async (data) => {
    try {
      await updatePatient(patient.id, data);
      toast.success("تم تحديث البيانات الشخصية بنجاح");
      onSuccess(data);
    } catch (error) {
      toast.error("حدث خطأ أثناء تحديث البيانات");
      console.error(error);
    }
  };

  return (
    <form className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {personalCfg.job?.enabled !== false && (
          <div className="space-y-2">
            <Label>{personalCfg.job?.label || "الوظيفة"}</Label>
            <Input {...register("job")} placeholder={personalCfg.job?.placeholder || ""} className="h-11" />
          </div>
        )}
        {personalCfg.marital_status?.enabled !== false && (
          <div className="space-y-2">
            <Label>{personalCfg.marital_status?.label || "الحالة الاجتماعية"}</Label>
            <Controller
              name="marital_status"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} dir="rtl">
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder={personalCfg.marital_status?.placeholder || "اختر الحالة"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">أعزب/ة</SelectItem>
                    <SelectItem value="married">متزوج/ة</SelectItem>
                    <SelectItem value="divorced">مطلق/ة</SelectItem>
                    <SelectItem value="widowed">أرمل/ة</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        )}
        {personalCfg.phone?.enabled !== false && (
          <div className="space-y-2">
            <Label>{personalCfg.phone?.label || "رقم الهاتف"}</Label>
            <Input {...register("phone")} placeholder={personalCfg.phone?.placeholder || ""} className="h-11 text-right" dir="ltr" />
          </div>
        )}
        {personalCfg.email?.enabled !== false && (
          <div className="space-y-2">
            <Label>{personalCfg.email?.label || "البريد الإلكتروني"}</Label>
            <Input
              {...register("email")}
              placeholder={personalCfg.email?.placeholder || ""}
              type="email"
              className="h-11 text-right"
              dir="ltr"
            />
          </div>
        )}
        {personalCfg.blood_type?.enabled !== false && (
          <div className="space-y-2">
            <Label>{personalCfg.blood_type?.label || "فصيلة الدم"}</Label>
            <Controller
              name="blood_type"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} dir="ltr">
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder={personalCfg.blood_type?.placeholder || "-"} />
                  </SelectTrigger>
                  <SelectContent>
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        )}
      </div>
      {personalCfg.address?.enabled !== false && (
        <div className="space-y-2">
          <Label>{personalCfg.address?.label || "العنوان"}</Label>
          <Textarea {...register("address")} placeholder={personalCfg.address?.placeholder || ""} />
        </div>
      )}

      <ActionButtons 
        onSave={handleSubmit(onSubmit)} 
        onCancel={onCancel} 
        isSubmitting={isSubmitting} 
      />
    </form>
  );
}

// --- Medical Profile Section ---

export function MedicalProfileForm({ patient, onCancel, onSuccess }) {
  const { data: preferences } = useUserPreferences();
  const medicalFieldsConfig = useMemo(
    () => normalizeMedicalFieldsConfig(preferences?.medical_fields_config),
    [preferences?.medical_fields_config]
  );
  const medicalCfg = medicalFieldsConfig.patient.fields.medical;

  const { register, control, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: {
      medical_history: {
        chronic_diseases: patient.medical_history?.chronic_diseases || [],
        allergies: patient.medical_history?.allergies || [],
        past_surgeries: patient.medical_history?.past_surgeries || [],
        family_history: patient.medical_history?.family_history || [],
      }
    }
  });

  const onSubmit = async (data) => {
    try {
      // Merge with existing medical history to avoid losing other fields
      const updatedMedicalHistory = {
        ...patient.medical_history,
        ...data.medical_history
      };
      
      await updatePatient(patient.id, { medical_history: updatedMedicalHistory });
      toast.success("تم تحديث الملف الطبي بنجاح");
      onSuccess({ medical_history: updatedMedicalHistory });
    } catch (error) {
      toast.error("حدث خطأ أثناء تحديث الملف الطبي");
      console.error(error);
    }
  };

  return (
    <form className="space-y-6">
      {medicalCfg.chronic_diseases?.enabled !== false && (
        <div className="space-y-2">
          <Label>{medicalCfg.chronic_diseases?.label || "الأمراض المزمنة"}</Label>
          <TagInput
            control={control}
            name="medical_history.chronic_diseases"
            placeholder={medicalCfg.chronic_diseases?.placeholder || ""}
          />
        </div>
      )}

      {medicalCfg.allergies?.enabled !== false && (
        <div className="space-y-2">
          <Label>{medicalCfg.allergies?.label || "الحساسية"}</Label>
          <TagInput control={control} name="medical_history.allergies" placeholder={medicalCfg.allergies?.placeholder || ""} />
        </div>
      )}

      {medicalCfg.past_surgeries?.enabled !== false && (
        <div className="space-y-2">
          <Label>{medicalCfg.past_surgeries?.label || "العمليات السابقة"}</Label>
          <TagInput
            control={control}
            name="medical_history.past_surgeries"
            placeholder={medicalCfg.past_surgeries?.placeholder || ""}
          />
        </div>
      )}

      {medicalCfg.family_history?.enabled !== false && (
        <div className="space-y-2">
          <Label>{medicalCfg.family_history?.label || "التاريخ العائلي"}</Label>
          <TagInput
            control={control}
            name="medical_history.family_history"
            placeholder={medicalCfg.family_history?.placeholder || ""}
          />
        </div>
      )}

      <ActionButtons 
        onSave={handleSubmit(onSubmit)} 
        onCancel={onCancel} 
        isSubmitting={isSubmitting} 
      />
    </form>
  );
}

// --- Insurance Section ---

export function InsuranceForm({ patient, onCancel, onSuccess }) {
  const { data: preferences } = useUserPreferences();
  const medicalFieldsConfig = useMemo(
    () => normalizeMedicalFieldsConfig(preferences?.medical_fields_config),
    [preferences?.medical_fields_config]
  );
  const insuranceCfg = medicalFieldsConfig.patient.fields.insurance;

  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: {
      insurance_info: {
        provider_name: patient.insurance_info?.provider_name || "",
        policy_number: patient.insurance_info?.policy_number || "",
        coverage_percent: patient.insurance_info?.coverage_percent || ""
      }
    }
  });

  const onSubmit = async (data) => {
    try {
      await updatePatient(patient.id, { insurance_info: data.insurance_info });
      toast.success("تم تحديث بيانات التأمين بنجاح");
      onSuccess({ insurance_info: data.insurance_info });
    } catch (error) {
      toast.error("حدث خطأ أثناء تحديث بيانات التأمين");
      console.error(error);
    }
  };

  return (
    <form className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insuranceCfg.provider_name?.enabled !== false && (
          <div className="space-y-2">
            <Label>{insuranceCfg.provider_name?.label || "شركة التأمين"}</Label>
            <Input
              {...register("insurance_info.provider_name")}
              placeholder={insuranceCfg.provider_name?.placeholder || ""}
              className="h-11"
            />
          </div>
        )}
        {insuranceCfg.policy_number?.enabled !== false && (
          <div className="space-y-2">
            <Label>{insuranceCfg.policy_number?.label || "رقم البوليصة"}</Label>
            <Input
              {...register("insurance_info.policy_number")}
              placeholder={insuranceCfg.policy_number?.placeholder || ""}
              className="h-11"
            />
          </div>
        )}
        {insuranceCfg.coverage_percent?.enabled !== false && (
          <div className="space-y-2">
            <Label>{insuranceCfg.coverage_percent?.label || "نسبة التغطية (%)"}</Label>
            <Input
              {...register("insurance_info.coverage_percent")}
              placeholder={insuranceCfg.coverage_percent?.placeholder || ""}
              className="h-11"
            />
          </div>
        )}
      </div>

      <ActionButtons 
        onSave={handleSubmit(onSubmit)} 
        onCancel={onCancel} 
        isSubmitting={isSubmitting} 
      />
    </form>
  );
}

export function CustomFieldsForm({ patient, sectionId, onCancel, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customFields, setCustomFields] = useState(Array.isArray(patient.custom_fields) ? patient.custom_fields : []);
  const [newField, setNewField] = useState({ name: "", type: "text", section_id: sectionId || "personal", optionsText: "" });
  const { data: preferences } = useUserPreferences();

  const medicalFieldsConfig = useMemo(
    () => normalizeMedicalFieldsConfig(preferences?.medical_fields_config),
    [preferences?.medical_fields_config]
  );
  const patientSections = medicalFieldsConfig.patient.sections;
  const patientCustomSections = medicalFieldsConfig.patient.customSections;
  const patientAllTemplates = useMemo(
    () => flattenCustomFieldTemplates({ config: medicalFieldsConfig, context: "patient" }),
    [medicalFieldsConfig]
  );

  useEffect(() => {
    const builtinSectionKeys = Array.isArray(patientSections?.order)
      ? patientSections.order.filter((k) => !String(k).startsWith("custom:"))
      : ["personal", "medical", "insurance"];
    const knownSectionIds = new Set([
      ...builtinSectionKeys.map(String),
      ...(patientCustomSections || []).map((s) => String(s?.id)),
    ]);
    setCustomFields(
      mergeTemplatesIntoCustomFields(Array.isArray(patient.custom_fields) ? patient.custom_fields : [], patientAllTemplates).map((f) => {
        const rawSection = String(f?.section_id || "personal");
        const mapped = rawSection === "default" ? "personal" : rawSection;
        if (!knownSectionIds.has(mapped)) return { ...f, section_id: "personal" };
        return { ...f, section_id: mapped };
      })
    );
  }, [patient.custom_fields, patientAllTemplates, patientCustomSections]);

  const addField = () => {
    const name = newField.name.trim();
    if (!name) return;
    const options =
      newField.type === "select" || newField.type === "multiselect"
        ? String(newField.optionsText || "")
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean)
        : [];
    setCustomFields((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name,
        type: newField.type,
        section_id: newField.section_id || sectionId || "personal",
        options,
        value: newField.type === "checkbox" ? false : newField.type === "multiselect" ? [] : newField.type === "progress" ? 50 : "",
      },
    ]);
    setNewField({ name: "", type: "text", section_id: sectionId || newField.section_id || "personal", optionsText: "" });
  };

  const removeField = (id) => {
    setCustomFields((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFieldValue = (id, value) => {
    setCustomFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, value } : f))
    );
  };

  const renderFieldInput = (field) => {
    if (field.type === "textarea") {
      return (
        <Textarea
          value={field.value ?? ""}
          onChange={(e) => updateFieldValue(field.id, e.target.value)}
          className="min-h-[80px] text-sm"
          placeholder={field.placeholder || ""}
        />
      );
    }

    if (field.type === "number") {
      return (
        <Input
          type="number"
          value={field.value ?? ""}
          onChange={(e) => updateFieldValue(field.id, e.target.value)}
          className="text-sm"
          placeholder={field.placeholder || ""}
        />
      );
    }

    if (field.type === "date") {
      return (
        <Input
          type="date"
          value={field.value ?? ""}
          onChange={(e) => updateFieldValue(field.id, e.target.value)}
          className="text-sm"
        />
      );
    }

    if (field.type === "checkbox") {
      return (
        <div className="flex items-center gap-3">
          <Switch checked={Boolean(field.value)} onCheckedChange={(checked) => updateFieldValue(field.id, checked)} />
          <span className="text-sm text-muted-foreground">{Boolean(field.value) ? "نعم" : "لا"}</span>
        </div>
      );
    }

    if (field.type === "progress") {
      const raw = Number(field.value);
      const value = Number.isFinite(raw) ? Math.min(100, Math.max(1, raw)) : 50;
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">النسبة</span>
            <span className="text-sm font-semibold">{value}%</span>
          </div>
          <Progress value={value} />
          <input
            type="range"
            min={1}
            max={100}
            value={value}
            onChange={(e) => updateFieldValue(field.id, Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>
      );
    }

    if (field.type === "select") {
      const options = Array.isArray(field.options) ? field.options : [];
      return (
        <Select value={String(field.value ?? "")} onValueChange={(v) => updateFieldValue(field.id, v)} dir="rtl">
          <SelectTrigger className="h-10 w-full justify-between text-sm">
            <SelectValue placeholder={field.placeholder || "اختار"} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (field.type === "multiselect") {
      const options = Array.isArray(field.options) ? field.options : [];
      const current = Array.isArray(field.value) ? field.value : [];
      return (
        <div className="space-y-2">
          {options.length === 0 ? (
            <div className="text-sm text-muted-foreground">لا توجد اختيارات</div>
          ) : (
            options.map((opt) => (
              <label key={opt} className="flex items-center gap-2">
                <Checkbox
                  checked={current.includes(opt)}
                  onCheckedChange={(checked) => {
                    const isOn = Boolean(checked);
                    const next = isOn ? Array.from(new Set([...current, opt])) : current.filter((x) => x !== opt);
                    updateFieldValue(field.id, next);
                  }}
                />
                <span className="text-sm text-muted-foreground">{opt}</span>
              </label>
            ))
          )}
        </div>
      );
    }

    return (
      <Input
        value={field.value ?? ""}
        onChange={(e) => updateFieldValue(field.id, e.target.value)}
        className="text-sm"
        placeholder={field.placeholder || ""}
      />
    );
  };

  const onSave = async () => {
    try {
      setIsSubmitting(true);
      await updatePatient(patient.id, { custom_fields: customFields });
      toast.success("تم تحديث الحقول الإضافية بنجاح");
      onSuccess({ custom_fields: customFields });
    } catch (error) {
      toast.error("حدث خطأ أثناء تحديث الحقول الإضافية");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {!sectionId && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-end">
            <div className="sm:col-span-3 space-y-2">
              <Label>اسم الحقل</Label>
              <Input
                value={newField.name}
                onChange={(e) => setNewField((prev) => ({ ...prev, name: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addField();
                  }
                }}
                placeholder="مثال: حساسية أدوية"
                className="h-11"
              />
            </div>

            <div className="sm:col-span-1 space-y-2">
              <Label>القسم</Label>
              <Select
                value={newField.section_id || "personal"}
                onValueChange={(value) => setNewField((prev) => ({ ...prev, section_id: value }))}
                dir="rtl"
              >
                <SelectTrigger className="h-11 justify-between">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Array.isArray(patientSections?.order) ? patientSections.order : ["personal", "medical", "insurance"])
                    .map(String)
                    .filter(Boolean)
                    .map((k) => {
                      if (k.startsWith("custom:")) {
                        const id = k.slice("custom:".length);
                        const cs = patientCustomSections.find((s) => String(s?.id) === id);
                        if (!cs || cs.enabled === false) return null;
                        return (
                          <SelectItem key={k} value={id}>
                            {cs.title}
                          </SelectItem>
                        );
                      }
                      if ((patientSections?.items?.[k] || {}).enabled === false) return null;
                      return (
                        <SelectItem key={k} value={k}>
                          {patientSections?.items?.[k]?.title || k}
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-1 space-y-2">
              <Label>النوع</Label>
              <Select
                value={newField.type}
                onValueChange={(value) => setNewField((prev) => ({ ...prev, type: value }))}
                dir="rtl"
              >
                <SelectTrigger className="h-11 justify-between">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">نص</SelectItem>
                  <SelectItem value="number">رقم</SelectItem>
                  <SelectItem value="date">تاريخ</SelectItem>
                  <SelectItem value="textarea">نص طويل</SelectItem>
                  <SelectItem value="checkbox">صح/غلط</SelectItem>
                  <SelectItem value="select">اختيار</SelectItem>
                  <SelectItem value="multiselect">اختيارات متعددة</SelectItem>
                  <SelectItem value="progress">نسبة (1-100)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={addField}
              disabled={!newField.name.trim()}
              className="sm:col-span-1 h-11"
            >
              إضافة
            </Button>
          </div>

          {(newField.type === "select" || newField.type === "multiselect") && (
            <div className="space-y-1">
              <Label>الاختيارات (افصل بينهم بفاصلة)</Label>
              <Input
                value={newField.optionsText || ""}
                onChange={(e) => setNewField((prev) => ({ ...prev, optionsText: e.target.value }))}
                className="h-11"
                placeholder="مثال: خفيف, متوسط, شديد"
              />
            </div>
          )}
        </>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="text-sm font-semibold">الحقول</div>
          <div className="space-y-2">
            {customFields
              .filter((f) => String(f?.section_id || "personal") === String(sectionId || "personal"))
              .map((field) => (
                <div key={field.id} className="rounded-lg border p-3 bg-card/50 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold">{field.name}</div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeField(field.id)}
                    >
                      <X className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                  {renderFieldInput(field)}
                </div>
              ))}
            {customFields.filter((f) => String(f?.section_id || "personal") === String(sectionId || "personal")).length === 0 && (
              <div className="text-sm text-muted-foreground">لا يوجد حقول</div>
            )}
          </div>
        </div>

        {!sectionId &&
          patientCustomSections
            .filter((s) => s.enabled !== false)
            .map((s) => {
              const fields = customFields.filter((f) => String(f?.section_id || "personal") === String(s.id));
              return (
                <div key={s.id} className="space-y-2">
                  <div className="text-sm font-semibold">{s.title}</div>
                  <div className="space-y-2">
                    {fields.length === 0 ? (
                      <div className="text-sm text-muted-foreground">لا يوجد حقول</div>
                    ) : (
                      fields.map((field) => (
                        <div key={field.id} className="rounded-lg border p-3 bg-card/50 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-semibold">{field.name}</div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => removeField(field.id)}
                            >
                              <X className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                          {renderFieldInput(field)}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
      </div>

      <ActionButtons onSave={onSave} onCancel={onCancel} isSubmitting={isSubmitting} />
    </div>
  );
}
