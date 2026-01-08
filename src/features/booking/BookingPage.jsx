import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";
import { 
  Calendar, 
  User, 
  Phone, 
  AlertCircle,
  ChevronLeft,
  Loader2,
  Shield,
  CreditCard
} from "lucide-react";

import AppointmentFormCard from "./AppointmentFormCard";
import BookingSuccessCard from "./BookingSuccessCard";
import ErrorState from "./ErrorState";
import LoadingState from "./LoadingState";
import PatientFormCard from "./PatientFormCard";
import { isAppointmentFormValid, validateWorkingHours } from "./bookingUtils";
import useClinicById from "./useClinicById";
import useCreateAppointmentPublic from "./useCreateAppointmentPublic";
import usePatientHandling from "./usePatientHandling";

export default function BookingPage() {
  const { clinicId } = useParams();
  const topRef = useRef(null);
  const {
    data: clinic,
    isLoading: isClinicLoading,
    isError: isClinicError,
  } = useClinicById(clinicId);
  const {
    register: registerPatient,
    handleSubmit: handleSubmitPatient,
    control: controlPatient,
    formState: { errors: patientErrors },
    reset: resetPatient,
    setValue: setPatientValue,
  } = useForm();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm();
  const { mutate: createAppointment, isPending: isCreatingAppointment } =
    useCreateAppointmentPublic();
  const { handlePatientSubmit, isCreatingPatient } = usePatientHandling();

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isBookingComplete, setIsBookingComplete] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [appointmentId, setAppointmentId] = useState(null);

  const isOnlineBookingEnabled = clinic?.online_booking_enabled !== false;

  // Scroll to top when step changes
  useEffect(() => {
    if (currentStep === 2 && topRef.current) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStep]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const phoneParam = urlParams.get('phone');
    if (phoneParam) {
      setPatientValue('phone', phoneParam);
    }
  }, [setPatientValue]);

  const handlePatientFormSubmit = async (data) => {
    try {
      const patient = await handlePatientSubmit(data, clinicId);
      setSelectedPatient(patient);
      setCurrentStep(2);
      toast.success("تم حفظ بياناتك بنجاح");
    } catch (error) {
      toast.error("مشكلة في حفظ بياناتك، حاول تاني");
    }
  };

  const onSubmit = (data) => {
    if (!selectedPatient) {
      toast.error("محتاج تكمل بياناتك الأول!");
      return;
    }

    if (!data.date) {
      toast.error("مش ناسي تختار يوم وساعة الموعد؟");
      return;
    }
    
    const date = new Date(data.date);
    if (isNaN(date.getTime())) {
      toast.error("الوقت الي اخترته مش صح");
      return;
    }
    
    const now = new Date();
    if (date < now) {
      toast.error("مينفعش تختار وقت قديم!");
      return;
    }

    const validationError = validateWorkingHours(
      data.date,
      clinic?.available_time
    );
    if (validationError) {
      toast.error(validationError);
      return;
    }

    createAppointment(
      {
        payload: {
          date: data.date,
          notes: data.notes || "",
          price: clinic?.booking_price || 0,
          patient_id: selectedPatient.id,
          from: "booking"
        },
        clinicId: clinicId,
      },
      {
        onSuccess: (data) => {
          setIsBookingComplete(true);
          setAppointmentId(data.id);
          reset();
        },
        onError: (error) => {
          toast.error("مشكلة في الحجز، حاول تاني");
        },
      }
    );
  };

  const handleReset = () => {
    setIsBookingComplete(false);
    reset();
    resetPatient();
    setSelectedPatient(null);
    setCurrentStep(1);
    setSelectedDate(null);
    setSelectedTime(null);
    setAppointmentId(null);
  };

  const handleBackToPatient = () => {
    setCurrentStep(1);
  };

  if (isClinicLoading) {
    return <LoadingState />;
  }

  if (isClinicError) {
    return <ErrorState />;
  }

  if (!isOnlineBookingEnabled) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-[var(--radius)] shadow-sm border border-gray-200 p-6">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-yellow-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">الحجز الإلكتروني مقفول دلوقتي</h2>
            <p className="text-gray-600 mb-6 text-sm">
              الحجز أونلاين مش شغال حالياً. ممكن تتصل بالعيادة مباشرة:
            </p>
            {clinic?.phone && (
              <div className="mb-6">
                <a 
                  href={`tel:${clinic.phone}`}
                  className="inline-flex items-center gap-2 text-blue-600 font-medium"
                >
                  <Phone className="w-5 h-5" />
                  {clinic.phone}
                </a>
              </div>
            )}
            <button
              onClick={() => window.history.back()}
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-[var(--radius)] hover:bg-gray-200 text-sm"
            >
              رجوع
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isBookingComplete) {
    return <BookingSuccessCard 
      onReset={handleReset} 
      appointmentId={appointmentId}
      clinic={clinic}
    />;
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div ref={topRef}>
        {/* Header - Centered */}
        <div className="bg-white border-b border-gray-200 py-5">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <h1 className="text-lg font-bold text-gray-900">{clinic?.name}</h1>
            <p className="text-gray-600 text-sm mt-1">احجز معادك في دقيقة</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Modern Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="text-center flex-1">
              <div className={`w-8 h-8 mx-auto mb-2 rounded-full flex items-center justify-center text-sm ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                1
              </div>
              <span className={`text-xs ${currentStep >= 1 ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                بيانات المريض
              </span>
            </div>
            
            <div className="flex-1 px-4">
              <div className="h-1 bg-gray-200">
                <div 
                  className={`h-full bg-blue-600 transition-all duration-300 ${currentStep === 2 ? 'w-full' : 'w-0'}`}
                ></div>
              </div>
            </div>
            
            <div className="text-center flex-1">
              <div className={`w-8 h-8 mx-auto mb-2 rounded-full flex items-center justify-center text-sm ${currentStep === 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                2
              </div>
              <span className={`text-xs ${currentStep === 2 ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                اختيار الموعد
              </span>
            </div>
          </div>
        </div>

        {/* Step 1: Patient Information */}
        {currentStep === 1 && (
          <div className="animate-in slide-in-from-left-10 duration-300">
            <div className="bg-white rounded-[var(--radius)] border border-gray-200 p-5 mb-4">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-blue-100 rounded-[var(--radius)] flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">بيانات المريض</h2>
                  <p className="text-sm text-gray-500">خلينا نعرف عنك شوية عشان نعرف نخدمك</p>
                </div>
              </div>
              
              <PatientFormCard
                register={registerPatient}
                control={controlPatient}
                errors={patientErrors}
                onSubmit={handleSubmitPatient(handlePatientFormSubmit)}
                isLoading={isCreatingPatient}
                clinicId={clinicId}
              />
            </div>

            <div className="bg-blue-50 rounded-[var(--radius)] border border-blue-200 p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-blue-800 font-medium text-sm mb-1">معلوماتك في أمان</p>
                  <p className="text-blue-700 text-xs">
                    بياناتك محمية ومش هنشاركها مع حد. كلها عشان خدمتك بس
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Appointment Details */}
        {currentStep === 2 && selectedPatient && (
          <div className="animate-in slide-in-from-right-10 duration-300">
            {/* Back Button - Aligned Left */}
            <div className="flex justify-start mb-4">
              <button
                onClick={handleBackToPatient}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm"
              >
                <ChevronLeft className="w-4 h-4" />
                تعديل البيانات الشخصية
              </button>
            </div>

            <div className="bg-white rounded-[var(--radius)] border border-gray-200 p-5 mb-4">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-green-100 rounded-[var(--radius)] flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">اختيار الموعد</h2>
                  <p className="text-sm text-gray-500">اختار اليوم والساعة اللي تناسبك</p>
                </div>
              </div>
              
              <AppointmentFormCard
                register={register}
                errors={errors}
                watch={watch}
                setValue={setValue}
                onSubmit={handleSubmit(onSubmit)}
                isLoading={isCreatingAppointment}
                clinic={clinic}
                selectedPatient={selectedPatient}
                onChangePatient={handleBackToPatient}
                validateWorkingHours={validateWorkingHours}
                isAppointmentFormValid={isAppointmentFormValid}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                selectedTime={selectedTime}
                setSelectedTime={setSelectedTime}
              />
            </div>

            {clinic?.booking_price > 0 && (
              <div className="bg-amber-50 rounded-[var(--radius)] border border-amber-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="text-amber-800 font-medium text-sm">سعر الحجز</p>
                      <p className="text-amber-700 text-xs">تسدد في العيادة</p>
                    </div>
                  </div>
                  <div className="text-base font-bold text-amber-700">
                    {clinic.booking_price} ج.م
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Help Section */}
        {clinic?.phone && currentStep === 2 && (
          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-gray-600 text-sm mb-2">محتاج مساعدة؟</p>
            <a 
              href={`tel:${clinic.phone}`}
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              <Phone className="w-4 h-4" />
              اتصل بنا: {clinic.phone}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}