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
