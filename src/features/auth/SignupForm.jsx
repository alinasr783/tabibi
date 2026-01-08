import { useState } from "react"
import { useForm } from "react-hook-form"
import toast from "react-hot-toast"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { generateClinicId } from "../../lib/clinicIdGenerator"
import useSignup from "./useSignup"
import useVerifyClinicId from "./useVerifyClinicId"
import { checkEmailExists, signInWithGoogle } from "../../services/apiAuth"
import { Mail, User, Building2, CheckCircle2, X, Stethoscope, FileText } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog"
import { Label } from "../../components/ui/label"

const STEPS = {
  ACCOUNT_INFO: 1,
  PERSONAL_INFO: 2,
  ROLE_SPECIFIC: 3,
  CERTIFICATIONS: 4,
}

export default function SignupForm() {
  const [currentStep, setCurrentStep] = useState(STEPS.ACCOUNT_INFO)
  const [selectedRole, setSelectedRole] = useState("")
  const [generatedClinicId, setGeneratedClinicId] = useState("")
  const [clinicVerification, setClinicVerification] = useState({ 
    status: null, // null, 'success', 'error'
    message: "" 
  })
  const [verifiedClinicId, setVerifiedClinicId] = useState("")
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [step3Touched, setStep3Touched] = useState(false)
  const [certifications, setCertifications] = useState([])
  const [skills, setSkills] = useState([])
  const [currentCertificate, setCurrentCertificate] = useState({
    name: '',
    issuing_organization: '',
    description: '',
    certificate_file: null
  })

  // Google Signup State
  const [googleSignupState, setGoogleSignupState] = useState({
    isOpen: false,
    role: "",
    clinicName: "",
    clinicAddress: "",
    clinicId: "",
    verificationStatus: null, // null, 'success', 'error'
    verificationMessage: ""
  })

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    trigger,
  } = useForm()

  const { mutate: signup, isPending: isSigningUp } = useSignup()
  const { mutate: verifyClinic, isPending: isVerifying } = useVerifyClinicId()

  const password = watch("password")
  const role = watch("role")
  const clinicIdInput = watch("clinicId")

  // Google Signup Handlers
  function handleGoogleVerifyClinic() {
    if (!googleSignupState.clinicId) {
      setGoogleSignupState(prev => ({
        ...prev,
        verificationStatus: 'error',
        verificationMessage: "لازم تدخل معرف العيادة"
      }))
      return
    }

    verifyClinic(googleSignupState.clinicId, {
      onSuccess: () => {
        setGoogleSignupState(prev => ({
          ...prev,
          verificationStatus: 'success',
          verificationMessage: "تم التحقق بنجاح"
        }))
      },
      onError: (error) => {
        setGoogleSignupState(prev => ({
          ...prev,
          verificationStatus: 'error',
          verificationMessage: error.message || "معرف العيادة ده مش موجود"
        }))
      },
    })
  }

  async function handleGoogleSignup() {
    const { role, clinicId, verificationStatus } = googleSignupState;
    
    if (!role) {
        toast.error("لازم تختار نوع الحساب");
        return;
    }

    let pendingData = { role };

    if (role === 'doctor') {
        // Clinic details will be set to defaults/empty as requested
        pendingData.clinicName = "";
        pendingData.clinicAddress = "";
        pendingData.clinicId = generateClinicId();
    } else if (role === 'secretary') {
        if (!clinicId) {
            toast.error("لازم تدخل معرف العيادة");
            return;
        }
        if (verificationStatus !== 'success') {
             toast.error("لازم تتحقق من معرف العيادة الأول");
             return;
        }
         pendingData.clinicId = clinicId;
         pendingData.permissions = [];
    }

    localStorage.setItem('pending_google_signup', JSON.stringify(pendingData));
    
    try {
      await signInWithGoogle();
    } catch (e) {
      console.error(e);
      toast.error("حصل خطأ في التسجيل بجوجل");
    }
  }

  async function handleNextStep() {
    let fieldsToValidate = []

    if (currentStep === STEPS.ACCOUNT_INFO) {
      fieldsToValidate = ["email", "password", "confirmPassword"]
      
      // Validate form fields first
      const isValid = await trigger(fieldsToValidate)
      if (!isValid) return

      // Check if email already exists before moving to next step
      const email = watch("email")
      setIsCheckingEmail(true)
      
      try {
        const emailExists = await checkEmailExists(email)
        if (emailExists) {
          toast.error("الإيميل ده موجود قبل كده، جرب إيميل تاني")
          setIsCheckingEmail(false)
          return
        }
        setIsCheckingEmail(false)
      } catch (error) {
        console.error("Error checking email:", error)
        toast.error("حصل مشكلة في التحقق من الإيميل")
        setIsCheckingEmail(false)
        return
      }

      setCurrentStep((prev) => prev + 1)
    } else if (currentStep === STEPS.PERSONAL_INFO) {
      fieldsToValidate = ["name", "phone", "role"]
      
      const isValid = await trigger(fieldsToValidate)
      if (!isValid) return

      if (role === "doctor") {
        // Generate clinic ID for doctor as UUID
        const clinicId = generateClinicId()
        setGeneratedClinicId(clinicId)
      }
      setCurrentStep((prev) => prev + 1)
    } else if (currentStep === STEPS.ROLE_SPECIFIC) {
      // Validate role-specific fields before moving to certifications
      if (role === "doctor") {
        fieldsToValidate = ["clinicName", "clinicAddress"]
        const isValid = await trigger(fieldsToValidate)
        if (!isValid) {
          toast.error("لازم تملى كل الحقول المطلوبة")
          return
        }
      } else if (role === "secretary" && !verifiedClinicId) {
        toast.error("لازم تتحقق من معرف العيادة الأول")
        return
      }
      setCurrentStep((prev) => prev + 1)
    }
  }

  function handlePrevStep() {
    setCurrentStep((prev) => prev - 1)
    // Reset step 3 touched state when going back
    if (currentStep === STEPS.ROLE_SPECIFIC) {
      setStep3Touched(false)
    }
  }

  function handleRoleChange(e) {
    setSelectedRole(e.target.value)
  }

  function handleVerifyClinicId() {
    if (!clinicIdInput) {
      setClinicVerification({
        status: 'error',
        message: "لازم تدخل معرف العيادة"
      })
      return
    }

    verifyClinic(clinicIdInput, {
      onSuccess: () => {
        setClinicVerification({
          status: 'success',
          message: "تم التحقق بنجاح"
        })
        setVerifiedClinicId(clinicIdInput)
      },
      onError: (error) => {
        setClinicVerification({
          status: 'error',
          message: error.message || "معرف العيادة ده مش موجود"
        })
        setVerifiedClinicId("")
      },
    })
  }

  // Certification handlers
  function handleCertificateInputChange(field, value) {
    setCurrentCertificate(prev => ({
      ...prev,
      [field]: value
    }))
  }

  async function handleCertificateFileChange(e) {
    const file = e.target.files?.[0]
    if (file) {
      setCurrentCertificate(prev => ({
        ...prev,
        certificate_file: file
      }))
    }
  }

  function handleAddCertificate() {
    if (!currentCertificate.name || !currentCertificate.issuing_organization) {
      toast.error("لازم تدخل اسم الشهادة والمنظمة")
      return
    }

    setCertifications(prev => [...prev, { ...currentCertificate, id: Date.now() }])
    setCurrentCertificate({
      name: '',
      issuing_organization: '',
      description: '',
      certificate_file: null
    })
    toast.success("تم إضافة الشهادة")
  }

  function handleRemoveCertificate(id) {
    setCertifications(prev => prev.filter(cert => cert.id !== id))
    toast.success("تم حذف الشهادة")
  }

  // Skills handlers
  function handleAddSkill(skillName) {
    if (!skillName || skillName.trim().length === 0) {
      toast.error("لازم تدخل اسم المهارة")
      return
    }

    if (skills.find(s => s.name.toLowerCase() === skillName.toLowerCase())) {
      toast.error("المهارة دي موجودة قبل كده")
      return
    }

    setSkills(prev => [...prev, { name: skillName, id: Date.now() }])
    toast.success("تم إضافة المهارة")
  }

  function handleRemoveSkill(id) {
    setSkills(prev => prev.filter(skill => skill.id !== id))
    toast.success("تم حذف المهارة")
  }

  async function handleCreateAccount() {
    // Mark step 3 as touched to show validation errors
    setStep3Touched(true)

    // Get all form data to validate
    const formData = watch()

    // Validate step 3 fields based on role
    let fieldsToValidate = []
    if (role === "doctor") {
      fieldsToValidate = ["clinicName", "clinicAddress"]
      
      // CRITICAL: Ensure clinic name and address are provided and not empty
      if (!formData.clinicName || formData.clinicName.trim().length === 0) {
        toast.error("لازم تدخل اسم العيادة")
        return
      }
      if (formData.clinicName.trim().length < 3) {
        toast.error("اسم العيادة لازم 3 أحرف على الأقل")
        return
      }
      if (!formData.clinicAddress || formData.clinicAddress.trim().length === 0) {
        toast.error("لازم تدخل عنوان العيادة")
        return
      }
      if (formData.clinicAddress.trim().length < 5) {
        toast.error("عنوان العيادة لازم 5 أحرف على الأقل")
        return
      }
    } else if (role === "secretary") {
      fieldsToValidate = ["clinicId"]
    }

    const isValid = await trigger(fieldsToValidate)
    if (!isValid) {
      toast.error("لازم تملى كل الحقول المطلوبة")
      return
    }

    // For secretary, check if clinic ID was verified
    if (role === "secretary" && !verifiedClinicId) {
      toast.error("لازم تتحقق من معرف العيادة الأول")
      return
    }

    // Generate clinic ID for doctor if not already generated
    let finalClinicId = generatedClinicId
    if (role === "doctor" && !finalClinicId) {
      finalClinicId = generateClinicId()
      setGeneratedClinicId(finalClinicId)
    }

    const userData = {
      name: formData.name,
      phone: formData.phone,
      role: formData.role,
      clinicId: role === "doctor" ? finalClinicId : verifiedClinicId,
    }

    // Add role-specific data with trimmed values
    if (role === "doctor") {
      userData.clinicName = formData.clinicName.trim()
      userData.clinicAddress = formData.clinicAddress.trim()
    } else if (role === "secretary") {
      userData.permissions = []
    }

    console.log("Creating account with data:", userData)

    signup({
      email: formData.email,
      password: formData.password,
      userData,
    })
  }

  function onSubmit(data) {
    // CRITICAL: Prevent ANY form submission unless explicitly on final step
    // This ensures account creation only happens via manual button click
    console.log("onSubmit called, current step:", currentStep)
    if (currentStep !== STEPS.ROLE_SPECIFIC) {
      console.log("Blocked submission - not on final step")
      return
    }

    // Mark step 3 as touched
    setStep3Touched(true)

    // For secretary, check if clinic ID was verified
    if (data.role === "secretary" && (!verifiedClinicId || verifiedClinicId !== data.clinicId)) {
      toast.error("لازم تتحقق من معرف العيادة الأول")
      return
    }

    // Generate clinic ID for doctor if not already generated
    let finalClinicId = generatedClinicId
    if (data.role === "doctor" && !finalClinicId) {
      finalClinicId = generateClinicId()
      setGeneratedClinicId(finalClinicId)
    }

    const userData = {
      name: data.name,
      phone: data.phone,
      role: data.role,
      clinicId: data.role === "doctor" ? finalClinicId : verifiedClinicId,
    }

    // Add role-specific data
    if (data.role === "doctor") {
      userData.clinicName = data.clinicName
      userData.clinicAddress = data.clinicAddress
    } else if (data.role === "secretary") {
      // Remove permissions field as requested - permissions will be set by doctor later
      userData.permissions = []
    }

    console.log("Submitting with clinic ID:", userData.clinicId)

    signup({
      email: data.email,
      password: data.password,
      userData,
    })
  }

  const stepConfig = [
    { number: 1, title: "معلومات الحساب", icon: Mail },
    { number: 2, title: "المعلومات الشخصية", icon: User },
    { number: 3, title: "تفاصيل الدور", icon: Building2 },
    { number: 4, title: "الشهادات والمهارات", icon: CheckCircle2 },
  ];

  return (
    <>
    <form 
      onSubmit={(e) => {
        e.preventDefault()
        console.log("Form submit prevented")
        // Do nothing - all navigation happens via buttons
      }} 
      className="space-y-6"
    >
      {/* Modern Progress Bar */}
      <div className="mb-10">
        {/* Progress Line */}
        <div className="relative">
          <div className="absolute top-5 right-0 w-full h-1 bg-muted">
            <div 
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
            />
          </div>
          
          {/* Steps */}
          <div className="relative flex justify-between">
            {stepConfig.map((step) => {
              const isCompleted = currentStep > step.number;
              const isCurrent = currentStep === step.number;
              const StepIcon = step.icon;
              
              return (
                <div key={step.number} className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isCompleted
                        ? "bg-primary text-primary-foreground scale-110"
                        : isCurrent
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/50 scale-110"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="size-5" />
                    ) : (
                      <StepIcon className="size-5" />
                    )}
                  </div>
                  <p
                    className={`text-xs mt-3 font-medium transition-colors duration-300 max-w-[80px] text-center ${
                      isCurrent || isCompleted
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step 1: Account Information */}
      {currentStep === STEPS.ACCOUNT_INFO && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-5 duration-300">

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              البريد الإلكتروني *
            </label>
            <Input
              id="email"
              type="email"
              {...register("email", {
                required: "لازم تدخل الإيميل",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "الإيميل ده مش صحيح",
                },
              })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleNextStep()
                }
              }}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              كلمة المرور *
            </label>
            <Input
              id="password"
              type="password"
              {...register("password", {
                required: "لازم تدخل كلمة المرور",
                minLength: {
                  value: 6,
                  message: "كلمة المرور لازم 6 أحرف على الأقل",
                },
              })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleNextStep()
                }
              }}
            />
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              تأكيد كلمة المرور *
            </label>
            <Input
              id="confirmPassword"
              type="password"
              {...register("confirmPassword", {
                required: "لازم تأكد كلمة المرور",
                validate: (value) =>
                  value === password || "كلمة المرور مش متطابقة",
              })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleNextStep()
                }
              }}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-red-500">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Personal Information */}
      {currentStep === STEPS.PERSONAL_INFO && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-5 duration-300">

          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              الاسم الكامل *
            </label>
            <Input
              id="name"
              type="text"
              {...register("name", {
                required: "لازم تدخل الاسم",
                minLength: {
                  value: 3,
                  message: "الاسم لازم 3 أحرف على الأقل",
                },
              })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleNextStep()
                }
              }}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium">
              رقم الهاتف *
            </label>
            <Input
              id="phone"
              type="tel"
              {...register("phone", {
                required: "لازم تدخل رقم الهاتف",
                pattern: {
                  value: /^[0-9]{10,15}$/,
                  message: "رقم الهاتف مش صحيح",
                },
              })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleNextStep()
                }
              }}
            />
            {errors.phone && (
              <p className="text-sm text-red-500">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="role" className="text-sm font-medium">
              نوع المستخدم *
            </label>
            <Controller
              control={control}
              name="role"
              rules={{ required: "لازم تختار نوع المستخدم" }}
              render={({ field }) => (
                <Select
                  onValueChange={(val) => {
                    field.onChange(val);
                    setSelectedRole(val);
                  }}
                  defaultValue={field.value}
                  value={field.value}
                  dir="rtl"
                >
                  <SelectTrigger id="role" className="h-10 w-full justify-between">
                    <SelectValue placeholder="اختر نوع المستخدم" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="doctor">طبيب</SelectItem>
                    <SelectItem value="secretary">سكرتير</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.role && (
              <p className="text-sm text-red-500">{errors.role.message}</p>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Role-Specific Information */}
      {currentStep === STEPS.ROLE_SPECIFIC && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-5 duration-300">

          {role === "doctor" && (
            <>
              <div className="space-y-2">
                <label htmlFor="clinicName" className="text-sm font-medium">
                  اسم العيادة
                </label>
                <Input
                  id="clinicName"
                  type="text"
                  {...register("clinicName", {
                    required: false,
                    minLength: {
                      value: 3,
                      message: "اسم العيادة لازم 3 أحرف على الأقل",
                    },
                  })}
                  placeholder="مثال: عيادة د. أحمد للأسنان"
                />
                {step3Touched && errors.clinicName && (
                  <p className="text-sm text-red-500">
                    {errors.clinicName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="clinicAddress" className="text-sm font-medium">
                  عنوان العيادة
                </label>
                <Input
                  id="clinicAddress"
                  type="text"
                  {...register("clinicAddress", {
                    required: false,
                    minLength: {
                      value: 5,
                      message: "عنوان العيادة لازم 5 أحرف على الأقل",
                    },
                  })}
                  placeholder="مثال: 15 شارع الجامعة، القاهرة"
                />
                {step3Touched && errors.clinicAddress && (
                  <p className="text-sm text-red-500">
                    {errors.clinicAddress.message}
                  </p>
                )}
              </div>
            </>
          )}

          {role === "secretary" && (
            <>
              <div className="space-y-2">
                <label htmlFor="clinicId" className="text-sm font-medium">
                  معرف العيادة *
                </label>
                <div className="flex gap-2">
                  <Input
                    id="clinicId"
                    type="text"
                    {...register("clinicId", {
                      required: "لازم تدخل معرف العيادة",
                    })}
                    placeholder="أدخل معرف العيادة من الطبيب"
                    readOnly={!!verifiedClinicId}
                  />
                  {!verifiedClinicId ? (
                    <Button
                      type="button"
                      onClick={handleVerifyClinicId}
                      disabled={isVerifying || !clinicIdInput}
                    >
                      {isVerifying ? "جاري التحقق..." : "تحقق"}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setVerifiedClinicId("")
                        setClinicVerification({ status: null, message: "" })
                      }}
                    >
                      تعديل
                    </Button>
                  )}
                </div>
                {errors.clinicId && (
                  <p className="text-sm text-red-500">
                    {errors.clinicId.message}
                  </p>
                )}
                {clinicVerification.status && (
                  <p className={`text-sm ${clinicVerification.status === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                    {clinicVerification.message}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-2 pt-4">
        {currentStep > STEPS.ACCOUNT_INFO && (
          <Button 
            type="button" 
            onClick={handlePrevStep} 
            variant="outline"
            className="flex-1"
            style={{ flexBasis: '25%' }}
          >
            السابق
          </Button>
        )}

        {currentStep < STEPS.ROLE_SPECIFIC ? (
          <Button
            type="button"
            onClick={handleNextStep}
            disabled={isCheckingEmail}
            className="flex-1"
            style={{ flexBasis: currentStep === STEPS.ACCOUNT_INFO ? '100%' : '75%' }}
          >
            {isCheckingEmail ? "جاري التحقق..." : "التالي"}
          </Button>
        ) : (
          <Button 
            type="button"
            onClick={handleCreateAccount}
            disabled={isSigningUp || (role === "secretary" && !verifiedClinicId)}
            className="flex-1"
            style={{ flexBasis: '75%' }}
          >
            {isSigningUp ? "جاري إنشاء الحساب..." : "إنشاء الحساب"}
          </Button>
        )}
      </div>
      
      {currentStep === STEPS.ACCOUNT_INFO && (
        <div className="mt-6">
          <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                  أو
                  </span>
              </div>
          </div>
          <Button 
              variant="outline" 
              type="button" 
              className="w-full h-12 text-base relative bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm font-roboto transition-all duration-200"
              onClick={() => setGoogleSignupState(prev => ({ ...prev, isOpen: true }))}
          >
              <div className="absolute right-4 bg-white p-1 rounded-full">
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                  <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                  <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                  <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                </svg>
              </div>
              <span className="font-medium">تسجيل الدخول باستخدام Google</span>
          </Button>
        </div>
      )}

      </form>

      <Dialog open={googleSignupState.isOpen} onOpenChange={(open) => setGoogleSignupState(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="sm:max-w-[600px] p-6 sm:p-10 rounded-[var(--radius)]">
           <button 
             onClick={() => setGoogleSignupState(prev => ({ ...prev, isOpen: false }))}
             className="absolute left-4 top-4 rounded-[var(--radius)] opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
           >
             <X className="h-4 w-4" />
             <span className="sr-only">Close</span>
           </button>
           <DialogHeader className="p-0 pb-4 text-center">
             <DialogTitle>اختر نوع الحساب للمتابعة</DialogTitle>
           </DialogHeader>
           
           <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                  <div 
                    className={`cursor-pointer rounded-[var(--radius)] border-2 p-4 hover:border-primary hover:bg-primary/5 transition-all duration-200 flex flex-col items-center gap-3 text-center ${googleSignupState.role === 'doctor' ? 'border-primary bg-primary/10' : 'border-muted'}`}
                    onClick={() => setGoogleSignupState(prev => ({ ...prev, role: 'doctor' }))}
                  >
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Stethoscope className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <div className="font-semibold">طبيب</div>
                        <div className="text-xs text-muted-foreground mt-1">لإدارة عيادتك والمرضى</div>
                    </div>
                  </div>

                  <div 
                    className={`cursor-pointer rounded-[var(--radius)] border-2 p-4 hover:border-primary hover:bg-primary/5 transition-all duration-200 flex flex-col items-center gap-3 text-center ${googleSignupState.role === 'secretary' ? 'border-primary bg-primary/10' : 'border-muted'}`}
                    onClick={() => setGoogleSignupState(prev => ({ ...prev, role: 'secretary' }))}
                  >
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <div className="font-semibold">سكرتير</div>
                        <div className="text-xs text-muted-foreground mt-1">لمساعدة الطبيب في الإدارة</div>
                    </div>
                  </div>
              </div>

              {googleSignupState.role === 'secretary' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                      <Label>معرف العيادة</Label>
                      <div className="flex gap-2">
                          <Input 
                              value={googleSignupState.clinicId}
                              onChange={(e) => setGoogleSignupState(prev => ({ 
                                  ...prev, 
                                  clinicId: e.target.value,
                                  verificationStatus: null 
                              }))}
                              placeholder="أدخل معرف العيادة"
                          />
                          <Button type="button" onClick={handleGoogleVerifyClinic} disabled={isVerifying}>
                              {isVerifying ? "..." : "تحقق"}
                          </Button>
                      </div>
                      {googleSignupState.verificationMessage && (
                          <p className={`text-sm ${googleSignupState.verificationStatus === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                              {googleSignupState.verificationMessage}
                          </p>
                      )}
                  </div>
              )}

              <Button 
                type="button" 
                onClick={handleGoogleSignup} 
                className="w-full mt-2"
                disabled={!googleSignupState.role}
              >
                  <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                      <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                  </svg>
                  متابعة باستخدام جوجل
              </Button>
           </div>
        </DialogContent>
      </Dialog>
    </>
  )
}