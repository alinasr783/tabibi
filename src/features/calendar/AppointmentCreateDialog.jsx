import { Search, UserPlus, Calendar, Clock, DollarSign, FileText, User, Phone, ArrowLeft, ArrowRight, Check, X, Loader2, ChevronLeft } from "lucide-react";
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

export default function AppointmentCreateDialog({ open, onClose }) {
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
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientDialog, setShowPatientDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [step, setStep] = useState(1);
  const { data: searchResults, isLoading: isSearching } = useSearchPatients(patientSearch);

  const watchPrice = watch("price");
  const watchNotes = watch("notes");

  // إعادة تعيين النموذج عند الإغلاق
  const handleClose = () => {
    reset();
    setSelectedPatient(null);
    setPatientSearch("");
    setSelectedDate(null);
    setSelectedTime(null);
    setStep(1);
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

  // حساب إذا كان يمكن الانتقال للخطوة التالية
  const canProceedToStep2 = selectedPatient && selectedDate && selectedTime;
  
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
        <DialogContent className="sm:max-w-[500px] w-[95vw] max-h-[90vh] h-auto p-0 rounded-xl border-0 shadow-2xl" dir="rtl">
          {/* Header */}
          <DialogHeader className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="h-8 w-8 rounded-full hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </Button>
                <DialogTitle className="text-lg font-bold text-gray-900">
                  إضافة موعد جديد
                </DialogTitle>
              </div>
              
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-gray-400'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-primary text-white' : 'bg-gray-200'}`}>
                    ٢
                  </div>
                </div>
                
                <div className="h-[2px] w-4 bg-gray-300"></div>
                
                <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-gray-400'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-primary text-white' : 'bg-gray-200'}`}>
                    ٢
                  </div>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 max-h-[calc(90vh-80px)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <form onSubmit={handleSubmit(onSubmit)} onKeyDown={handleKeyDown} className="space-y-6">
              {/* الخطوة 1: اختيار المريض والموعد */}
              {step === 1 && (
                <div className="space-y-6">
                  {/* اختيار المريض */}
                  <div className="space-y-4">
<div className="flex items-center justify-between" style={{ direction: 'rtl' }}>
                      <h3 className="font-semibold text-gray-900 text-lg">
                        ٢. اختيار المريض
                      </h3>
                      {selectedPatient && (
                        <Badge className="bg-green-500 text-white text-xs">
                           تم الاختيار
                        </Badge>
                      )}
                    </div>
                    
                    {/* البحث */}
                    <div className="space-y-3"  style={{ direction: 'rtl' }}>
                      <div className="relative"  style={{ direction: 'rtl' }}>
                        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" style={{ direction: 'rtl' }} />
                        <Input  style={{ direction: 'rtl' }}
                          className="pr-9 text-base border-gray-300 focus:border-primary h-11 "
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
                        className="w-full border border-gray-300 hover:border-primary hover:bg-blue-50 h-11"
                      >
                        <UserPlus className="w-4 h-4 ml-2" />
                        إضافة مريض جديد
                      </Button>
                    </div>

                    {/* نتائج البحث */}
                    {patientSearch.length >= 2 && !selectedPatient && (
                      <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm max-h-48 overflow-y-auto" style={{ direction: 'rtl' }}>
                        {isSearching ? (
                          <div className="p-4 text-center" style={{ direction: 'rtl' }}>
                            <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" style={{ direction: 'rtl' }} />
                            <p className="text-gray-500 text-sm mt-2" style={{ direction: 'rtl' }}>جاري البحث...</p>
                          </div>
                        ) : searchResults?.length > 0 ? (
                          <div>
                            {searchResults.map((patient) => (
                              <button
                                key={patient.id}
                                type="button"
                                className="w-full p-3 text-right hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center justify-between"
                                onClick={() => handlePatientSelect(patient)}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                    <User className="w-4 h-4 text-primary" />
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900">
                                      {patient.name}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {patient.phone}
                                    </div>
                                  </div>
                                </div>
                                <ChevronLeft className="w-4 h-4 text-gray-400" />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 text-center"  style={{ direction: 'rtl' }}>
                            <p className="text-gray-500">لا توجد نتائج</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* المريض المختار */}
                    {selectedPatient && (
                      <Card className="bg-green-50 border-green-200" style={{ direction: 'rtl' }}>
                        <CardContent className="p-3" style={{ direction: 'rtl' }}>
                          <div className="flex items-center justify-between" style={{ direction: 'rtl' }}>
                            <div className="flex items-center gap-3" style={{ direction: 'rtl' }}>
                              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center" style={{ direction: 'rtl' }}>
                                <User className="w-5 h-5 text-green-600" style={{ direction: 'rtl' }} />
                              </div>
                              <div>
                                <div className="font-bold text-gray-900">
                                  {selectedPatient.name}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {selectedPatient.phone}
                                </div>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedPatient(null)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              تغيير
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* اختيار الموعد */}
                  <div className="space-y-4" style={{ direction: 'rtl' }}>
                    <div className="flex items-center justify-between" style={{ direction: 'rtl' }}>
                      <h3 className="font-semibold text-gray-900 text-lg"  style={{ direction: 'rtl' }}>
                        ٢. تحديد الموعد
                      </h3>
                      {selectedTime && (
                        <Badge className="bg-blue-500 text-white text-xs" style={{ direction: 'rtl' }}>
                           تم التحديد
                        </Badge>
                      )}
                    </div>

                    {/* التقويم واختيار الوقت */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <AppointmentTimePicker
                        selectedDate={selectedDate}
                        onDateChange={setSelectedDate}
                        selectedTime={selectedTime}
                        onTimeChange={setSelectedTime}
                        clinicAvailableTime={clinicData?.available_time}
                        className="w-full"
                        mobileView={true}
                      />
                    </div>

                    {/* الموعد المختار */}
                    {selectedDate && selectedTime && (
                      <Card className="bg-blue-50 border-blue-200"  style={{ direction: 'rtl' }}>
                        <CardContent className="p-3" style={{ direction: 'rtl' }}>
                          <div className="flex items-center justify-between" style={{ direction: 'rtl' }}>
                            <div className="flex items-center gap-3" style={{ direction: 'rtl' }}>
                              <Calendar className="w-5 h-5 text-blue-600"  style={{ direction: 'rtl' }}/>
                              <div>
                                <div className="font-bold text-gray-900" style={{ direction: 'rtl' }}>
                                  {new Date(selectedDate).toLocaleDateString('ar-SA', {
                                    weekday: 'long',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </div>
                                <div className="text-sm text-gray-600" style={{ direction: 'rtl' }}>
                                  الساعة {selectedTime}
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
                              }}
                              style={{ direction: 'rtl' }}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              تغيير
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* زر التالي */}
                  <div className="pt-4" style={{ direction: 'rtl' }}>
                    <Button
                      type="button"
                      style={{ direction: 'rtl' }}
                      onClick={() => setStep(2)}
                      disabled={!canProceedToStep2}
                      className="w-full bg-primary hover:bg-primary/90 h-12 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {canProceedToStep2 ? (
                        <>
                          التالي
                          <ArrowLeft className="w-4 h-4 mr-2" style={{ direction: 'rtl' }}/>
                        </>
                      ) : (
                        "اختر المريض والموعد أولاً"
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* الخطوة 2: السعر ونوع الحجز */}
              {step === 2 && (
                <div className="space-y-6"  style={{ direction: 'rtl' }}>
                  <div className="flex items-center gap-2" style={{ direction: 'rtl' }}>
                    <h3 className="font-semibold text-gray-900 text-lg"  style={{ direction: 'rtl' }}>
                      الخطوة الثانية: تفاصيل الحجز
                    </h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setStep(1)}
                      className="h-8 w-8 rounded-full hover:bg-gray-100"
                       style={{ direction: 'rtl' }}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* ملخص سريع */}
                  {/* <Card className="bg-gray-50 border-gray-200"  style={{ direction: 'rtl' }}>
                    <CardContent className="p-4" style={{ direction: 'rtl' }}>
                      <div className="space-y-3 text-sm" style={{ direction: 'rtl' }}>
                        <div className="flex justify-between items-center" style={{ direction: 'rtl' }}>
                          <span className="text-gray-600" style={{ direction: 'rtl' }}>المريض:</span>
                          <span className="font-semibold"  style={{ direction: 'rtl' }}>{selectedPatient?.name}</span>
                        </div>
                        <div className="flex justify-between items-center" style={{ direction: 'rtl' }}>
                          <span className="text-gray-600" style={{ direction: 'rtl' }}>الموعد:</span>
                          <span className="font-semibold text-right" style={{ direction: 'rtl' }}>
                            {selectedDate && new Date(selectedDate).toLocaleDateString('ar-SA')}
                            <br />
                            <span className="text-gray-600" style={{ direction: 'rtl' }}>الساعة {selectedTime}</span>
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card> */}

                  {/* السعر */}
                  <div className="space-y-2" style={{ direction: 'rtl' }}>
                    <Label className="text-sm font-medium text-gray-900" style={{ direction: 'rtl' }}>
                      سعر الحجز
                    </Label>
                    <div className="relative" style={{ direction: 'rtl' }}>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="text-base border-gray-300 focus:border-primary h-11 pr-3"
                        placeholder="0.00"
                        {...register("price", {
                          required: "يرجى إدخال السعر",
                          min: { value: 0, message: "يجب أن يكون السعر موجباً" },
                        })}
                        style={{ direction: 'rtl' }}
                      />
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"  style={{ direction: 'rtl' }}>
                        جنيه
                      </span>
                    </div>
                    {errors.price && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.price.message}
                      </p>
                    )}
                  </div>

                  {/* نوع الحجز */}
                  <div className="space-y-2" style={{ direction: 'rtl' }}>
                    <Label className="text-sm font-medium text-gray-900" style={{ direction: 'rtl' }}>
                      نوع الحجز
                    </Label>
                    <Textarea
                      className="border-gray-300 focus:border-primary min-h-[100px] text-base"
                      placeholder="أدخل نوع الحجز (مثال: كشف أولي، متابعة...)"
                      {...register("notes", { 
                        required: "يرجى إدخال نوع الحجز",
                        maxLength: {
                          value: 100,
                          message: "يجب ألا يتجاوز 100 حرف"
                        }
                      })}
                      style={{ direction: 'rtl' }}
                    />
                    {errors.notes && (
                      <p className="text-sm text-red-500 mt-1"  style={{ direction: 'rtl' }}>
                        {errors.notes.message}
                      </p>
                    )}
                    
                    {/* الخيارات السريعة */}
                    <div className="flex flex-wrap gap-2 mt-2"  style={{ direction: 'rtl' }}>
                      {['كشف أولي', 'متابعة', 'استشارة', 'فحص', 'علاج'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleQuickAppointmentType(type)}
                          className={`px-3 py-1.5 border rounded-lg text-sm transition-colors ${
                            watchNotes === type 
                              ? 'bg-primary text-white border-primary' 
                              : 'bg-white border-gray-300 hover:border-primary'
                          }`}
                         style={{ direction: 'rtl' }}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* الملخص النهائي */}
                  {/* <Card className="bg-primary/5 border-primary/20" style={{ direction: 'rtl' }}>
                    <CardContent className="p-4" style={{ direction: 'rtl' }}>
                      <h4 className="font-semibold text-gray-900 text-sm mb-3" style={{ direction: 'rtl' }}>
                        ملخص الحجز
                      </h4>
                      <div className="space-y-2 text-sm" style={{ direction: 'rtl' }}>
                        <div className="flex justify-between" style={{ direction: 'rtl' }}>
                          <span className="text-gray-600" style={{ direction: 'rtl' }}>المريض:</span>
                          <span className="font-medium" style={{ direction: 'rtl' }}>{selectedPatient?.name}</span>
                        </div>
                        <div className="flex justify-between" style={{ direction: 'rtl' }}>
                          <span className="text-gray-600" style={{ direction: 'rtl' }}>الموعد:</span>
                          <span className="font-medium" style={{ direction: 'rtl' }}>
                            {selectedDate && new Date(selectedDate).toLocaleDateString('ar-SA')}
                            <br />
                            <span className="text-gray-600" style={{ direction: 'rtl' }}>الساعة {selectedTime}</span>
                          </span>
                        </div>
                        <div className="flex justify-between" style={{ direction: 'rtl' }}>
                          <span className="text-gray-600" style={{ direction: 'rtl' }}>السعر:</span>
                          <span className="font-medium text-primary" style={{ direction: 'rtl' }}>
                            {watchPrice ? `${watchPrice} جنيه` : '0 جنيه'}
                          </span>
                        </div>
                        <div className="flex justify-between" style={{ direction: 'rtl' }}>
                          <span className="text-gray-600" style={{ direction: 'rtl' }}>النوع:</span>
                          <span className="font-medium" style={{ direction: 'rtl' }}>{watchNotes || '---'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card> */}

                  {/* أزرار الإجراءات */}
                  <div className="flex gap-3 pt-4 pb-0" style={{ direction: 'rtl' }}>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="flex-1 border-gray-300 hover:bg-gray-50 h-11"
                    >
                      <ArrowRight className="w-4 h-4 ml-2" />
                      رجوع
                    </Button>
                    <Button
                      type="button"
                      disabled={isPending}
                      onClick={async () => {
                        // Trigger form submission manually with validation
                        const isValid = await trigger(["price", "notes"]);
                        if (isValid) {
                          // Directly call onSubmit since we're handling validation here
                          const formData = {
                            price: watchPrice,
                            notes: watchNotes
                          };
                          onSubmit(formData);
                        } else {
                          toast.error("يرجى ملء جميع الحقول المطلوبة");
                        }
                      }}
                      className="flex-1 bg-primary hover:bg-primary/90 h-11"
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin ml-2" />
                          جاري الإضافة...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 ml-2" />
                          إضافة الموعد
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