import { Search, UserPlus, Calendar, Clock, Banknote, FileText, User, Phone, ArrowLeft, ArrowRight, Check, X, Loader2, ChevronLeft } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import AppointmentTimePicker from "../../components/ui/appointment-time-picker";
import PatientCreateDialog from "../patients/PatientCreateDialog";
import useSearchPatients from "./useSearchPatients";
import useCreateAppointmentHandler from "./useCreateAppointmentHandler";
import useClinic from "../auth/useClinic";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import toast from "react-hot-toast";
import { ScrollArea } from "../../components/ui/scroll-area";

export default function AppointmentCreateDialog({ open, onClose, initialPatient }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    trigger,
  } = useForm({
    defaultValues: {
      price: "",
      notes: "",
    }
  });
  
  const { handleAppointmentSubmit, isPending } = useCreateAppointmentHandler();
  const { data: clinicData } = useClinic();
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(initialPatient || null);
  const [showPatientDialog, setShowPatientDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [step, setStep] = useState(initialPatient ? 2 : 1);
  const [autoSelectEnabled, setAutoSelectEnabled] = useState(true);
  const { data: searchResults, isLoading: isSearching } = useSearchPatients(patientSearch);

  useEffect(() => {
    if (initialPatient && open) {
        setSelectedPatient(initialPatient);
        // Don't skip to step 2, let user pick date first
        setStep(1);
        // Disable auto-select so user can choose explicitly
        setAutoSelectEnabled(false);
    }
  }, [initialPatient, open]);

  const watchPrice = watch("price");
  const watchNotes = watch("notes");

  // إعادة تعيين النموذج عند الإغلاق
  const handleClose = () => {
    reset();
    if (!initialPatient) {
        setSelectedPatient(null);
        setStep(1);
    }
    setPatientSearch("");
    setSelectedDate(null);
    setSelectedTime(null);
    setAutoSelectEnabled(true); // Reset auto-select for next time
    onClose();
  };

  const onSubmit = async (data) => {
    // Extra safeguard to prevent automatic submission
    if (step !== 2) {
      console.warn("Form submission attempted outside of step 2");
      return;
    }
    
    if (!selectedPatient) {
      toast.error("يجب اختيار المريض أولاً");
      return;
    }

    if (!selectedDate || !selectedTime) {
      toast.error("يجب تحديد التاريخ والوقت");
      return;
    }

    // تحويل الوقت لصيغة ISO
    let [timePart, period] = selectedTime.split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);
    
    if (period === 'م' && hours !== 12) {
      hours += 12;
    } else if (period === 'ص' && hours === 12) {
      hours = 0;
    }
    
    const appointmentDate = new Date(selectedDate);
    appointmentDate.setHours(hours, minutes, 0, 0);
    data.date = appointmentDate.toISOString();
    
    // Remove past date validation - allow booking in the past
    // This is useful for adding historical appointments
    
    // التحقق من صحة البيانات
    const isValid = await trigger(["price", "notes"]);
    if (!isValid) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    
    // التحقق من اختيار المريض
    if (!selectedPatient || !selectedPatient.id) {
      toast.error("يرجى اختيار مريض");
      return;
    }
    
    // التحقق من أن clinic_id هو UUID صالح
    const clinicUuid = clinicData?.clinic_uuid;
    if (!clinicUuid) {
      toast.error("خطأ في تحميل بيانات العيادة");
      return;
    }
    
    // Ensure price is a valid number or 0 if empty
    const priceValue = data.price === "" || data.price === null || data.price === undefined ? 0 : parseFloat(data.price) || 0;
    
    // Ensure age is a valid number or null if not provided
    let appointmentData = {
      ...data,
      price: priceValue,
      patient_id: selectedPatient.id,
      clinic_id: clinicUuid  // Use the UUID for appointments table
    };
    
    // Remove age field if it's empty or invalid
    if (appointmentData.age === "" || appointmentData.age === null || appointmentData.age === undefined) {
      delete appointmentData.age;
    } else {
      // Ensure age is a valid integer
      const ageValue = parseInt(appointmentData.age, 10);
      if (!isNaN(ageValue)) {
        appointmentData.age = ageValue;
      } else {
        delete appointmentData.age;
      }
    }
    
    handleAppointmentSubmit(appointmentData, () => {
      toast.success("تم إضافة الموعد بنجاح");
      handleClose();
    });
  };

  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    setPatientSearch(patient.name);
  };

  const handlePatientCreated = (newPatient) => {
    setSelectedPatient(newPatient);
    setPatientSearch(newPatient.name);
    setShowPatientDialog(false);
    toast.success("تم إضافة المريض بنجاح");
  };

  const handleQuickAppointmentType = (type) => {
    setValue("notes", type, { shouldValidate: true });
  };

  // Handle date change and disable auto-select after first manual selection
  const handleDateChange = (date) => {
    setSelectedDate(date);
    if (autoSelectEnabled) {
      setAutoSelectEnabled(false);
    }
  };

  const handleTimeChange = (time) => {
    setSelectedTime(time);
  };

  // حساب إذا كان يمكن الانتقال للخطوة التالية
  const canProceedToStep2 = !!(selectedPatient && selectedDate && selectedTime);
  
  // Ensure we don't automatically advance to step 2
  // This is to prevent automatic submission when all fields are filled
  const shouldAutoAdvance = false; // Disabled automatic advancement
  
  // Remove any automatic advancement logic that might have been here before
  
  // Prevent form submission on Enter key press
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Only allow proceeding to step 2 with Enter key if on step 1 and all fields are filled
      if (step === 1 && canProceedToStep2) {
        setStep(2);
      }
      // On step 2, prevent Enter from submitting the form
      if (step === 2) {
        e.stopPropagation();
      }
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[600px] w-[95vw] max-w-[95vw] max-h-[90vh] p-0 rounded-[var(--radius)] overflow-hidden border border-border" dir="rtl">
          {/* Header */}
          <DialogHeader className="p-4 sticky top-0 z-10 bg-background border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="h-8 w-8 rounded-[var(--radius)]"
                >
                  <X className="w-4 h-4" />
                </Button>
                <DialogTitle className="text-lg font-bold">
                  موعد جديد
                </DialogTitle>
              </div>
              
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all ${
                  step === 1 ? 'bg-primary text-white' : 'bg-primary/20 text-primary'
                }`}>
                  1
                </div>
                
                <div className={`h-[2px] w-8 transition-colors ${
                  step === 2 ? 'bg-primary' : 'bg-border'
                }`}></div>
                
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all ${
                  step === 2 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                }`}>
                  2
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 max-h-[calc(90vh-80px)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <form onSubmit={handleSubmit(onSubmit)} onKeyDown={handleKeyDown} className="space-y-6">
              {/* الخطوة 1: اختيار المريض والموعد */}
              {step === 1 && (
                <div className="space-y-5">
                  {/* اختيار المريض */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        اختيار المريض
                      </h3>
                      {selectedPatient && (
                        <Badge variant="default" className="text-xs">
                          تم
                        </Badge>
                      )}
                    </div>
                    
                    {/* البحث */}
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          className="pr-9 h-10"
                          placeholder="ابحث عن مريض..."
                          value={patientSearch}
                          onChange={(e) => setPatientSearch(e.target.value)}
                        />
                      </div>

                      {/* زر إضافة مريض جديد */}
                      <Button
                        type="button"
                        onClick={() => setShowPatientDialog(true)}
                        variant="outline"
                        className="w-full h-9"
                        size="sm"
                      >
                        <UserPlus className="w-4 h-4 ml-2" />
                        مريض جديد
                      </Button>
                    </div>

                    {/* نتائج البحث */}
                    {patientSearch.length >= 2 && !selectedPatient && (
                      <div className="rounded-[var(--radius)] border border-border overflow-hidden max-h-48 overflow-y-auto">
                        {isSearching ? (
                          <div className="p-4 text-center">
                            <Loader2 className="w-4 h-4 animate-spin text-primary mx-auto" />
                            <p className="text-muted-foreground text-xs mt-2">جاري البحث...</p>
                          </div>
                        ) : searchResults?.length > 0 ? (
                          <div>
                            {searchResults.map((patient) => (
                              <button
                                key={patient.id}
                                type="button"
                                className="w-full p-2.5 text-right hover:bg-muted/50 border-b border-border last:border-b-0 flex items-center justify-between transition-colors"
                                onClick={() => handlePatientSelect(patient)}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center">
                                    <User className="w-3.5 h-3.5 text-primary" />
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium">
                                      {patient.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {patient.phone}
                                    </div>
                                  </div>
                                </div>
                                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 text-center">
                            <p className="text-muted-foreground text-xs">لا توجد نتائج</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* المريض المختار */}
                    {selectedPatient && (
                      <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <div className="text-sm font-medium">
                                  {selectedPatient.name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {selectedPatient.phone}
                                </div>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedPatient(null)}
                              className="h-7 text-xs"
                            >
                              تغيير
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* اختيار الموعد */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        تحديد الموعد
                      </h3>
                      {selectedTime && (
                        <Badge variant="default" className="text-xs">
                          تم
                        </Badge>
                      )}
                    </div>

                    {/* التقويم واختيار الوقت */}
                    <div className="rounded-[var(--radius)] overflow-hidden">
                      <AppointmentTimePicker
                        selectedDate={selectedDate}
                        onDateChange={handleDateChange}
                        selectedTime={selectedTime}
                        onTimeChange={handleTimeChange}
                        clinicAvailableTime={clinicData?.available_time}
                        autoSelectFirstAvailable={autoSelectEnabled}
                        className="w-full"
                      />
                    </div>

                    {/* الموعد المختار */}
                    {selectedDate && selectedTime && (
                      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              <div>
                                <div className="text-sm font-medium">
                                  {new Date(selectedDate).toLocaleDateString('ar-SA', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {selectedTime}
                                </div>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedDate(null);
                                setSelectedTime(null);
                                setAutoSelectEnabled(true);
                              }}
                              className="h-7 text-xs"
                            >
                              تغيير
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* زر التالي */}
                  <div className="pt-2">
                    <Button
                      type="button"
                      onClick={() => setStep(2)}
                      disabled={!canProceedToStep2}
                      className="w-full h-10 disabled:opacity-50"
                    >
                      {canProceedToStep2 ? (
                        <>
                          التالي
                          <ArrowLeft className="w-4 h-4 mr-2" />
                        </>
                      ) : (
                        "اختر المريض والموعد"
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* الخطوة 2: السعر ونوع الحجز */}
              {step === 2 && (
                <div className="space-y-5">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setStep(1)}
                      className="h-8 w-8 rounded-[var(--radius)]"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                    <h3 className="text-sm font-medium text-foreground">
                      تفاصيل الحجز
                    </h3>
                  </div>

                  {/* السعر */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-primary" />
                      سعر الحجز
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="h-10 pr-3"
                        placeholder="0.00"
                        {...register("price", {
                          required: "يرجى إدخال السعر",
                          min: { value: 0, message: "يجب أن يكون السعر موجباً" },
                        })}
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        جنيه
                      </span>
                    </div>
                    {errors.price && (
                      <p className="text-xs text-red-500">
                        {errors.price.message}
                      </p>
                    )}
                  </div>

                  {/* نوع الحجز */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      نوع الحجز
                    </Label>
                    <Textarea
                      className="min-h-[80px] resize-none"
                      placeholder="مثال: كشف أولي، متابعة..."
                      {...register("notes", { 
                        required: "يرجى إدخال نوع الحجز",
                        maxLength: {
                          value: 100,
                          message: "يجب ألا يتجاوز 100 حرف"
                        }
                      })}
                    />
                    {errors.notes && (
                      <p className="text-xs text-red-500">
                        {errors.notes.message}
                      </p>
                    )}
                    
                    {/* الخيارات السريعة */}
                    <div className="flex flex-wrap gap-2">
                      {['كشف أولي', 'متابعة', 'استشارة', 'فحص', 'علاج'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleQuickAppointmentType(type)}
                          className={`px-3 py-1.5 rounded-[var(--radius)] text-xs font-medium transition-all ${
                            watchNotes === type 
                              ? 'bg-primary text-white shadow-sm' 
                              : 'bg-muted hover:bg-muted/80'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* أزرار الإجراءات */}
                  <div className="flex gap-3 pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="w-[25%] h-10"
                    >
                      <ArrowRight className="w-4 h-4 ml-2" />
                      رجوع
                    </Button>
                    <Button
                      type="button"
                      disabled={isPending}
                      onClick={async () => {
                        const isValid = await trigger(["price", "notes"]);
                        if (isValid) {
                          const formData = {
                            price: watchPrice,
                            notes: watchNotes
                          };
                          onSubmit(formData);
                        } else {
                          toast.error("يرجى ملء جميع الحقول");
                        }
                      }}
                      className="w-[75%] h-10"
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin ml-2" />
                          جاري...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 ml-2" />
                          حجز الموعد
                        </>
                      )} 
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Patient Create Dialog */}
      <PatientCreateDialog
        open={showPatientDialog}
        onClose={() => setShowPatientDialog(false)}
        onPatientCreated={handlePatientCreated}
      />
    </>
  );
}