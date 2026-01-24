import { useState, useEffect } from "react";
import { useForm, Controller, useFieldArray, useController } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Phone, MapPin, Briefcase, Heart, 
  FileText, Shield, Upload, X, Plus, ChevronLeft, ChevronRight, Check 
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { Checkbox } from "../../components/ui/checkbox";
import { TagInput } from "../../components/ui/tag-input";
import { uploadPatientAttachment } from "../../services/apiAttachments";

const STEPS = [
  { id: 1, title: "البيانات الأساسية", icon: User },
  { id: 2, title: "بيانات شخصية", icon: Briefcase },
  { id: 3, title: "الملف الطبي", icon: Heart },
  { id: 4, title: "التأمين والمرفقات", icon: Shield },
];

export default function PatientWizardForm({ onSubmit, isSubmitting, initialData, onCancel }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [attachments, setAttachments] = useState([]);
  const [attachmentTypes, setAttachmentTypes] = useState([]);
  const [isReadyToSubmit, setIsReadyToSubmit] = useState(false);
  
  const { register, control, handleSubmit, trigger, formState: { errors }, watch, reset } = useForm({
    defaultValues: {
      name: initialData?.name || "",
      phone: initialData?.phone || "",
      gender: initialData?.gender || "",
      age: initialData?.age || "",
      age_unit: initialData?.age_unit || "years",
      job: initialData?.job || "",
      marital_status: initialData?.marital_status || "",
      email: initialData?.email || "",
      address: initialData?.address || "",
      blood_type: initialData?.blood_type || "",
      medical_history: {
        chronic_diseases: initialData?.medical_history?.chronic_diseases || [],
        allergies: initialData?.medical_history?.allergies || [],
        past_surgeries: initialData?.medical_history?.past_surgeries || [],
        family_history: initialData?.medical_history?.family_history || [],
        blood_pressure: initialData?.medical_history?.blood_pressure || "",
        blood_sugar: initialData?.medical_history?.blood_sugar || "",
        chief_complaint: initialData?.medical_history?.chief_complaint || ""
      },
      insurance_info: {
        provider_name: initialData?.insurance_info?.provider_name || "",
        policy_number: initialData?.insurance_info?.policy_number || "",
        coverage_percent: initialData?.insurance_info?.coverage_percent || ""
      }
    }
  });

  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name || "",
        phone: initialData.phone || "",
        gender: initialData.gender || "",
        age: initialData.age || "",
        age_unit: initialData.age_unit || "years",
        job: initialData.job || "",
        marital_status: initialData.marital_status || "",
        email: initialData.email || "",
        address: initialData.address || "",
        blood_type: initialData.blood_type || "",
        medical_history: {
          chronic_diseases: initialData.medical_history?.chronic_diseases || [],
          allergies: initialData.medical_history?.allergies || [],
          past_surgeries: initialData.medical_history?.past_surgeries || [],
          family_history: initialData.medical_history?.family_history || [],
          blood_pressure: initialData.medical_history?.blood_pressure || "",
          blood_sugar: initialData.medical_history?.blood_sugar || "",
          chief_complaint: initialData.medical_history?.chief_complaint || ""
        },
        insurance_info: {
          provider_name: initialData.insurance_info?.provider_name || "",
          policy_number: initialData.insurance_info?.policy_number || "",
          coverage_percent: initialData.insurance_info?.coverage_percent || ""
        }
      });
    }
  }, [initialData, reset]);

  // Prevent accidental double-click submission when reaching the last step
  useEffect(() => {
    if (currentStep === STEPS.length) {
      const timer = setTimeout(() => setIsReadyToSubmit(true), 500);
      return () => clearTimeout(timer);
    } else {
      setIsReadyToSubmit(false);
    }
  }, [currentStep]);

  const nextStep = async () => {
    let fieldsToValidate = [];
    if (currentStep === 1) fieldsToValidate = ["name", "phone", "gender"];
    
    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files]);
    // Initialize types with "other" or empty string, and empty descriptions
    setAttachmentTypes(prev => [...prev, ...new Array(files.length).fill("report")]); 
    setAttachmentDescriptions(prev => [...prev, ...new Array(files.length).fill("")]);
  };

  const removeFile = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
    setAttachmentTypes(prev => prev.filter((_, i) => i !== index));
    setAttachmentDescriptions(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleDescriptionChange = (index, value) => {
    setAttachmentDescriptions(prev => {
        const newDesc = [...prev];
        newDesc[index] = value;
        return newDesc;
    });
  };

  const handleTypeChange = (index, value) => {
    setAttachmentTypes(prev => {
        const newTypes = [...prev];
        newTypes[index] = value;
        return newTypes;
    });
  };

  const handleKeyDown = (e) => {
    // Prevent submission on Enter key, except for textareas
    if (e.key === 'Enter') {
      // If the event was already handled (e.g. by TagInput), ignore it
      if (e.defaultPrevented) return;
      
      // Allow new lines in textareas
      if (e.target.tagName === 'TEXTAREA') return;
      
      e.preventDefault();
      
      // If not on the last step, try to move to next step
      if (currentStep < STEPS.length) {
        nextStep();
      }
    }
  };

  const onFinalSubmit = async (data) => {
    // Ensure we are on the last step before submitting
    // This prevents accidental submission via Enter key on previous steps
    // although handleKeyDown should catch most cases, this is a safety net
    if (currentStep < STEPS.length) {
      await nextStep();
      return;
    }

    // Pass data and attachments to the parent handler
    // We combine description and type into a single metadata object if needed by API
    // Or pass them as separate arrays depending on API signature
    // Assuming API takes (data, files, descriptions, types) or similar
    await onSubmit(data, attachments, attachmentDescriptions, attachmentTypes);
  };

  return (
    <div className="w-full max-w-2xl mx-auto" dir="rtl">
      {/* Stepper Header */}
      <div className="flex justify-between items-center mb-8 relative px-2">
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-100 -z-10" />
        <div 
          className="absolute top-1/2 right-0 h-1 bg-primary transition-all duration-300 -z-10"
          style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
        />
        
        {STEPS.map((step) => {
          const Icon = step.icon;
          const isActive = step.id === currentStep;
          const isCompleted = step.id < currentStep;
          
          return (
            <div key={step.id} className="flex flex-col items-center bg-background px-2">
              <div 
                className={`
                  w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300
                  ${isActive ? "border-primary bg-primary text-white scale-110 shadow-md" : 
                    isCompleted ? "border-primary bg-primary text-white" : "border-gray-200 text-gray-400 bg-background"}
                `}
              >
                {isCompleted ? <Check className="w-4 h-4 md:w-5 md:h-5" /> : <Icon className="w-4 h-4 md:w-5 md:h-5" />}
              </div>
              <span className={`text-[10px] md:text-xs mt-2 font-medium hidden md:block ${isActive ? "text-primary" : "text-gray-500"}`}>
                {step.title}
              </span>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit(onFinalSubmit)} onKeyDown={handleKeyDown} className="space-y-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>الاسم الكامل *</Label>
                  <Input 
                    {...register("name", { required: "الاسم مطلوب" })}
                    placeholder="اسم المريض رباعي"
                    className="h-11"
                  />
                  {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>رقم الهاتف *</Label>
                    <Input 
                      {...register("phone", { required: "رقم الهاتف مطلوب" })}
                      placeholder="05xxxxxxxx"
                      className="h-11"
                      dir="ltr"
                      className="text-right"
                    />
                    {errors.phone && <p className="text-red-500 text-sm">{errors.phone.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>النوع *</Label>
                    <Controller
                      name="gender"
                      control={control}
                      rules={{ required: "النوع مطلوب" }}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value} dir="rtl">
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="اختر النوع" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">ذكر</SelectItem>
                            <SelectItem value="female">أنثى</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.gender && <p className="text-red-500 text-sm">{errors.gender.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>العمر</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="number"
                      {...register("age")}
                      placeholder="العمر"
                      className="h-11"
                    />
                    <Controller
                      name="age_unit"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value} dir="rtl">
                          <SelectTrigger className="w-[100px] h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="years">سنة</SelectItem>
                            <SelectItem value="months">شهر</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Personal Info */}
            {currentStep === 2 && (
              <div className="space-y-4">
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
                </div>

                <div className="space-y-2">
                  <Label>البريد الإلكتروني</Label>
                  <Input {...register("email")} type="email" placeholder="email@example.com" className="h-11" dir="ltr" className="text-right" />
                </div>

                <div className="space-y-2">
                  <Label>العنوان</Label>
                  <Textarea {...register("address")} placeholder="العنوان بالتفصيل" />
                </div>
              </div>
            )}

            {/* Step 3: Medical History */}
            {currentStep === 3 && (
              <div className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                   <div className="space-y-2">
                     <Label>الضغط (آخر قياس)</Label>
                     <Input {...register("medical_history.blood_pressure")} placeholder="120/80" className="h-11" dir="ltr" />
                   </div>
                   <div className="space-y-2">
                     <Label>السكر (آخر قياس)</Label>
                     <Input {...register("medical_history.blood_sugar")} placeholder="mg/dl" className="h-11" dir="ltr" />
                   </div>
                 </div>

                 <div className="space-y-2">
                   <Label>الشكوى الرئيسية</Label>
                   <Textarea {...register("medical_history.chief_complaint")} placeholder="مما يشتكي المريض بشكل رئيسي؟" />
                 </div>

                 <div className="space-y-2">
                   <Label>أمراض مزمنة</Label>
                   <TagInput control={control} name="medical_history.chronic_diseases" placeholder="اكتب المرض واضغط Enter" />
                 </div>

                 <div className="space-y-2">
                   <Label>حساسية</Label>
                   <TagInput control={control} name="medical_history.allergies" placeholder="اكتب مسبب الحساسية واضغط Enter" />
                 </div>
              </div>
            )}

            {/* Step 4: Insurance & Attachments */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    بيانات التأمين
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>شركة التأمين</Label>
                      <Input {...register("insurance_info.provider_name")} placeholder="اسم الشركة" className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label>رقم البوليصة</Label>
                      <Input {...register("insurance_info.policy_number")} placeholder="رقم الكارت/البوليصة" className="h-11" />
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    المرفقات والوثائق
                  </h3>
                  
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 text-gray-500" />
                        <p className="text-sm text-gray-500">اضغط لرفع ملفات (صور، PDF)</p>
                      </div>
                      <input type="file" className="hidden" multiple onChange={handleFileChange} />
                    </label>
                  </div>

                  {attachments.length > 0 && (
                    <div className="space-y-3 mt-4">
                      {attachments.map((file, idx) => (
                        <div key={idx} className="p-3 bg-white rounded-lg border shadow-sm transition-all hover:shadow-md">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                               <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                                  <FileText className="w-5 h-5" />
                               </div>
                               <div className="flex-1 min-w-0">
                                 <p className="text-sm font-medium truncate" title={file.name}>
                                   {file.name.length > 25 ? file.name.substring(0, 25) + "..." : file.name}
                                 </p>
                                 <p className="text-xs text-muted-foreground">
                                   {(file.size / 1024 / 1024).toFixed(2)} MB
                                 </p>
                               </div>
                            </div>
                            
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => removeFile(idx)}
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                               <Label htmlFor={`type-${idx}`} className="text-xs font-medium text-muted-foreground">نوع الملف</Label>
                               <Select 
                                 value={attachmentTypes[idx] || "report"} 
                                 onValueChange={(val) => handleTypeChange(idx, val)}
                               >
                                 <SelectTrigger id={`type-${idx}`} className="h-8 text-xs bg-gray-50/50">
                                   <SelectValue />
                                 </SelectTrigger>
                                 <SelectContent>
                                   <SelectItem value="report">تقرير طبي</SelectItem>
                                   <SelectItem value="lab">تحاليل</SelectItem>
                                   <SelectItem value="xray">أشعة</SelectItem>
                                   <SelectItem value="prescription">روشتة</SelectItem>
                                   <SelectItem value="insurance">تأمين</SelectItem>
                                   <SelectItem value="other">أخرى</SelectItem>
                                 </SelectContent>
                               </Select>
                            </div>
                            
                            <div className="space-y-1">
                              <Label htmlFor={`desc-${idx}`} className="text-xs font-medium text-muted-foreground">ملاحظات (اختياري)</Label>
                              <Input 
                                id={`desc-${idx}`}
                                placeholder="وصف للملف..." 
                                value={attachmentDescriptions[idx] || ""} 
                                onChange={(e) => handleDescriptionChange(idx, e.target.value)}
                                className="h-8 text-xs bg-gray-50/50"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Actions */}
        <div className="flex gap-2 pt-6 border-t mt-8 w-full">
      <div className="w-1/4 flex gap-2">
        {currentStep > 1 && (
          <Button type="button" variant="outline" onClick={prevStep} className="w-full">
            <ChevronRight className="w-4 h-4 ml-2" />
            السابق
          </Button>
        )}
        
        {onCancel && !((currentStep > 1)) && (
          <Button type="button" variant="outline" onClick={onCancel} className="w-full">
            إلغاء
          </Button>
        )}
      </div>

      <div className="w-3/4">
        {currentStep < STEPS.length ? (
          <Button type="button" onClick={nextStep} className="w-full">
            التالي
            <ChevronLeft className="w-4 h-4 mr-2" />
          </Button>
        ) : (
          <Button type="submit" disabled={isSubmitting || !isReadyToSubmit} className="w-full">
            {isSubmitting ? "جاري الحفظ..." : (initialData ? "تحديث البيانات" : "حفظ المريض")}
            <Check className="w-4 h-4 mr-2" />
          </Button>
        )}
      </div>
    </div>
      </form>
    </div>
  );
}
