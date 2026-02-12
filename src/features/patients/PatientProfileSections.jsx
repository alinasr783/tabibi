import { useState } from "react";
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
import { updatePatient } from "../../services/apiPatients";
import toast from "react-hot-toast";

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
        <div className="space-y-2">
          <Label>الوظيفة</Label>
          <Input {...register("job")} placeholder="مثال: مهندس، مدرس" className="h-11" />
        </div>
        <div className="space-y-2">
          <Label>الحالة الاجتماعية</Label>
          <Controller
            name="marital_status"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value} dir="rtl">
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="اختر الحالة" />
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
        <div className="space-y-2">
          <Label>رقم الهاتف</Label>
          <Input {...register("phone")} className="h-11 text-right" dir="ltr" />
        </div>
        <div className="space-y-2">
          <Label>البريد الإلكتروني</Label>
          <Input {...register("email")} type="email" className="h-11 text-right" dir="ltr" />
        </div>
        <div className="space-y-2">
          <Label>فصيلة الدم</Label>
           <Controller
            name="blood_type"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value} dir="ltr">
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="-" />
                </SelectTrigger>
                <SelectContent>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>العنوان</Label>
        <Textarea {...register("address")} placeholder="العنوان بالتفصيل" />
      </div>

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
      <div className="space-y-2">
        <Label>الأمراض المزمنة</Label>
        <TagInput control={control} name="medical_history.chronic_diseases" placeholder="اكتب المرض واضغط Enter" />
      </div>
      
      <div className="space-y-2">
        <Label>الحساسية</Label>
        <TagInput control={control} name="medical_history.allergies" placeholder="اكتب مسبب الحساسية واضغط Enter" />
      </div>

      <div className="space-y-2">
        <Label>العمليات السابقة</Label>
        <TagInput control={control} name="medical_history.past_surgeries" placeholder="اكتب العملية واضغط Enter" />
      </div>

      <div className="space-y-2">
        <Label>التاريخ العائلي</Label>
        <TagInput control={control} name="medical_history.family_history" placeholder="اكتب المرض الوراثي واضغط Enter" />
      </div>

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
        <div className="space-y-2">
          <Label>شركة التأمين</Label>
          <Input {...register("insurance_info.provider_name")} placeholder="اسم الشركة" className="h-11" />
        </div>
        <div className="space-y-2">
          <Label>رقم البوليصة</Label>
          <Input {...register("insurance_info.policy_number")} placeholder="رقم الكارت/البوليصة" className="h-11" />
        </div>
        <div className="space-y-2">
          <Label>نسبة التغطية (%)</Label>
          <Input {...register("insurance_info.coverage_percent")} placeholder="مثال: 80" className="h-11" />
        </div>
      </div>

      <ActionButtons 
        onSave={handleSubmit(onSubmit)} 
        onCancel={onCancel} 
        isSubmitting={isSubmitting} 
      />
    </form>
  );
}

export function CustomFieldsForm({ patient, onCancel, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customFields, setCustomFields] = useState(
    Array.isArray(patient.custom_fields) ? patient.custom_fields : []
  );
  const [newField, setNewField] = useState({ name: "", type: "text" });

  const addField = () => {
    const name = newField.name.trim();
    if (!name) return;
    setCustomFields((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name, type: newField.type, value: "" },
    ]);
    setNewField({ name: "", type: "text" });
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
        <div className="flex items-center gap-2">
          <Checkbox
            checked={Boolean(field.value)}
            onCheckedChange={(checked) => updateFieldValue(field.id, checked)}
          />
          <span className="text-sm text-muted-foreground">نعم / لا</span>
        </div>
      );
    }

    return (
      <Input
        value={field.value ?? ""}
        onChange={(e) => updateFieldValue(field.id, e.target.value)}
        className="text-sm"
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
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
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

      {customFields.length === 0 ? (
        <div className="text-sm text-muted-foreground">لا يوجد حقول إضافية</div>
      ) : (
        <div className="space-y-2">
          {customFields.map((field) => (
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
        </div>
      )}

      <ActionButtons onSave={onSave} onCancel={onCancel} isSubmitting={isSubmitting} />
    </div>
  );
}
