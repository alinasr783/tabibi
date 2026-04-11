import { useEffect, useState } from "react"
import { useNavigate, useLocation, useParams } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { Card } from "../../components/ui/card"
import { useAuth } from "../auth/AuthContext"
import useClinic from "../auth/useClinic"
import useClinicSecretaries from "./useClinicSecretaries"
import useUpdateClinic from "./useUpdateClinic"
import ClinicInfoForm from "./ClinicInfoForm"
import SecretsSection from "./SecretsSection"
import { initializeAvailableTime } from "./clinicUtils"
import { Settings, Users, Info, ExternalLink, Wallet, Plus } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import ClinicWalletTab from "./ClinicWalletTab"
import useUserClinics from "./useUserClinics"
import { createClinicForCurrentUser, setActiveClinic } from "../../services/apiClinic"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../components/ui/dialog"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import toast from "react-hot-toast"

export default function ClinicPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isUuid = (v) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v));
  
  // Apply scroll to top on route changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const {
    data: clinic,
    isLoading: isClinicLoading,
    isError: isClinicError,
  } = useClinic()

  const { data: clinics } = useUserClinics()

  const {
    data: secretaries,
    isLoading: isSecretariesLoading,
    isError: isSecretariesError,
  } = useClinicSecretaries(clinic?.clinic_uuid)

  const { mutate: updateClinic, isPending: isUpdating } = useUpdateClinic()

  const [isAddClinicOpen, setIsAddClinicOpen] = useState(false)
  const [newClinicName, setNewClinicName] = useState("")
  const [newClinicAddress, setNewClinicAddress] = useState("")
  const [isCreatingClinic, setIsCreatingClinic] = useState(false)

  const [clinicFormData, setClinicFormData] = useState({
    name: "",
    address: "",
    booking_price: "",
    available_time: {
      saturday: { start: "", end: "", off: false },
      sunday: { start: "", end: "", off: false },
      monday: { start: "", end: "", off: false },
      tuesday: { start: "", end: "", off: false },
      wednesday: { start: "", end: "", off: false },
      thursday: { start: "", end: "", off: false },
      friday: { start: "", end: "", off: false },
    },
    online_booking_enabled: true,
  })

  // Initialize form data
  useEffect(() => {
    if (!clinic) return

    setClinicFormData((prev) => {
      const hasValues =
        prev.name ||
        prev.address ||
        prev.booking_price ||
        Object.values(prev.available_time).some(
          (t) => t.start || t.end || t.off
        ) ||
        prev.online_booking_enabled !== true

      if (hasValues) return prev

      const initializedAvailableTime = initializeAvailableTime(
        clinic.available_time
      )

      return {
        name: clinic.name || "",
        address: clinic.address || "",
        booking_price: clinic.booking_price || "",
        available_time: initializedAvailableTime,
        online_booking_enabled: clinic.online_booking_enabled !== undefined 
          ? clinic.online_booking_enabled 
          : true,
      }
    })
  }, [clinic])

  useEffect(() => {
    const clinicIdParam = params?.clinicId
    if (!clinicIdParam || !isUuid(clinicIdParam)) return
    if (String(clinic?.clinic_uuid || "") === String(clinicIdParam)) return

    ;(async () => {
      try {
        await setActiveClinic(clinicIdParam)
        queryClient.invalidateQueries({ queryKey: ["clinic"] })
        queryClient.invalidateQueries({ queryKey: ["user-clinics"] })
      } catch (e) {
        toast.error(e?.message || "تعذر تحديد العيادة")
      }
    })()
  }, [params?.clinicId, clinic?.clinic_uuid, queryClient])

  const handleClinicChange = (e) => {
    const { name, value } = e.target
    setClinicFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleTimeChange = (day, field, value) => {
    setClinicFormData((prev) => ({
      ...prev,
      available_time: {
        ...prev.available_time,
        [day]: {
          ...prev.available_time[day],
          [field]: value,
        },
      },
    }))
  }

  const toggleDayOff = (day) => {
    setClinicFormData((prev) => ({
      ...prev,
      available_time: {
        ...prev.available_time,
        [day]: {
          ...prev.available_time[day],
          off: !prev.available_time[day].off,
        },
      },
    }))
  }

  const handleUpdateClinic = (e) => {
    e.preventDefault()
    updateClinic(clinicFormData)
  }

  const handleOpenClinicDetails = async (clinicUuid) => {
    try {
      await setActiveClinic(clinicUuid)
      queryClient.invalidateQueries({ queryKey: ["clinic"] })
      queryClient.invalidateQueries({ queryKey: ["user-clinics"] })
      navigate(`/clinic/${clinicUuid}`)
    } catch (e) {
      toast.error(e?.message || "تعذر فتح تفاصيل العيادة")
    }
  }

  const handleCreateClinic = async () => {
    if (!String(newClinicName || "").trim()) {
      toast.error("اسم العيادة مطلوب")
      return
    }

    try {
      setIsCreatingClinic(true)
      const clinicUuid = await createClinicForCurrentUser({ name: newClinicName, address: newClinicAddress })
      await setActiveClinic(clinicUuid)
      setIsAddClinicOpen(false)
      setNewClinicName("")
      setNewClinicAddress("")
      queryClient.invalidateQueries({ queryKey: ["clinic"] })
      queryClient.invalidateQueries({ queryKey: ["user-clinics"] })
      navigate(`/clinic/${clinicUuid}`)
      toast.success("تمت إضافة العيادة")
    } catch (e) {
      toast.error(e?.message || "تعذر إضافة العيادة")
    } finally {
      setIsCreatingClinic(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4 md:p-6 pb-20 md:pb-6 w-full max-w-full overflow-x-hidden" dir="rtl">
      <div className="max-w-4xl mx-auto w-full" style={{ direction: 'rtl' }}>
        {/* Header */}
        <div className="mb-4 sm:mb-5 md:mb-6">
          <div className="flex items-center gap-2 sm:gap-3 md:gap-3 mb-3 sm:mb-4 md:mb-4">
            <div className="p-1.5 sm:p-2 md:p-2 rounded-[var(--radius)] bg-primary/10 text-primary flex-shrink-0">
              <Settings className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 flex-shrink-0" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground leading-tight">
                العيادة
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                ادِر فروعك وعدّل بيانات العيادة
              </p>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <Tabs defaultValue="clinic-info" className="w-full mb-4 sm:mb-6" style={{ direction: 'rtl' }}>
          <TabsList className="grid grid-cols-3 w-full h-auto p-1 sm:p-1.5 bg-muted/50 rounded-[var(--radius)]">
            <TabsTrigger 
              value="clinic-info" 
              className="text-xs sm:text-sm py-2.5 sm:py-3 px-2 data-[state=active]:bg-background rounded-[var(--radius)] transition-all duration-200"
            >
              <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span>المعلومات</span>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="secretaries" 
              className="text-xs sm:text-sm py-2.5 sm:py-3 px-2 data-[state=active]:bg-background rounded-[var(--radius)] transition-all duration-200"
            >
              <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span>الموظفين</span>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="wallet" 
              className="text-xs sm:text-sm py-2.5 sm:py-3 px-2 data-[state=active]:bg-background rounded-[var(--radius)] transition-all duration-200"
            >
              <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span>رصيدك</span>
              </div>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="clinic-info" className="mt-4 sm:mt-6">
            <div className="space-y-4 sm:space-y-6">
              <Card className="bg-card/70 w-full overflow-hidden border border-border/50 shadow-sm rounded-[var(--radius)]">
                <div className="border-b border-border/50 p-3 sm:p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-sm sm:text-base font-bold text-foreground truncate">فروعك</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">اختر فرع للتفاصيل أو التعديل</p>
                  </div>
                  {user?.role === "doctor" && (
                    <Button
                      type="button"
                      onClick={() => setIsAddClinicOpen(true)}
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      إضافة عيادة
                    </Button>
                  )}
                </div>

                <div className="p-3 sm:p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(clinics || []).map((c) => {
                      const isActive = String(c?.clinic_uuid || "") === String(clinic?.clinic_uuid || "")
                      return (
                        <Card key={c.clinic_uuid} className={`border border-border/50 ${isActive ? "bg-primary/5" : "bg-background/60"}`}>
                          <div className="p-3 sm:p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="font-bold text-sm sm:text-base truncate">{c.name || "بدون اسم"}</div>
                                <div className="text-xs sm:text-sm text-muted-foreground truncate">{c.address || "بدون عنوان"}</div>
                              </div>
                              {isActive && (
                                <div className="text-[10px] sm:text-xs px-2 py-1 rounded-[var(--radius)] bg-primary/10 text-primary flex-shrink-0">
                                  الحالية
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant={isActive ? "secondary" : "default"}
                                className="w-full"
                                onClick={() => handleOpenClinicDetails(c.clinic_uuid)}
                              >
                                التفاصيل
                              </Button>
                            </div>
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              </Card>

              <Card className="bg-card/70 w-full overflow-hidden border border-border/50 shadow-sm rounded-[var(--radius)]">
                <ClinicInfoForm
                  clinicFormData={clinicFormData}
                  isClinicLoading={isClinicLoading}
                  isClinicError={isClinicError}
                  isUpdating={isUpdating}
                  onClinicChange={handleClinicChange}
                  onTimeChange={handleTimeChange}
                  onDayToggle={toggleDayOff}
                  onSubmit={handleUpdateClinic}
                  clinicId={clinic?.clinic_uuid}
                  bookingUserId={clinic?.owner_user_id || user?.id}
                />
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="secretaries" className="mt-4 sm:mt-6">
            <Card className="bg-card/70 w-full overflow-hidden border border-border/50 shadow-sm rounded-[var(--radius)]">
              <div className="border-b border-border/50 p-3 sm:p-4 md:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 rounded-[var(--radius)] bg-primary/10 text-primary flex-shrink-0">
                    <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 flex-shrink-0" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base sm:text-lg md:text-lg font-bold text-foreground leading-tight">
                      إدارة الموظفين
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      أضف وادر موظفي العيادة
                    </p>
                  </div>
                </div>
              </div>
              
              <SecretsSection
                secretaries={secretaries}
                isLoading={isSecretariesLoading}
                isError={isSecretariesError}
              />
            </Card>
          </TabsContent>

          <TabsContent value="wallet" className="mt-4 sm:mt-6">
            <ClinicWalletTab />
          </TabsContent>
        </Tabs>

        {/* Bottom Info */}
        <div className="mt-4 sm:mt-6 md:mt-8 p-3 sm:p-4 md:p-4 bg-card/70 rounded-[var(--radius)] border border-border/50 shadow-sm w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="p-1.5 sm:p-2 rounded-[var(--radius)] bg-blue-500/10 text-blue-600 dark:text-blue-400 flex-shrink-0">
                <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground text-sm sm:text-base mb-1">
                  معلومات مهمة
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  أي تغيير هيظهر على صفحة الحجز للمرضى
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => window.open(`/doctor/${clinic?.clinic_uuid}`, '_blank')}
              className="border-primary/20 text-primary hover:bg-primary/10 w-full sm:w-auto text-xs sm:text-sm py-2.5 sm:py-3 min-h-[40px] gap-2"
            >
              <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              شوف ملفك الشخصي
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isAddClinicOpen} onOpenChange={setIsAddClinicOpen}>
        <DialogContent className="sm:max-w-[480px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة عيادة جديدة</DialogTitle>
            <DialogDescription>هتظهر ضمن فروعك وتقدر تعدّل بياناتها بعد الإنشاء</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="newClinicName">اسم العيادة</Label>
              <Input
                id="newClinicName"
                value={newClinicName}
                onChange={(e) => setNewClinicName(e.target.value)}
                placeholder="مثال: عيادة المعادي"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newClinicAddress">العنوان (اختياري)</Label>
              <Input
                id="newClinicAddress"
                value={newClinicAddress}
                onChange={(e) => setNewClinicAddress(e.target.value)}
                placeholder="مثال: 10 شارع ..."
              />
            </div>
          </div>

          <DialogFooter>
            <div className="flex gap-2 w-full">
              <Button className="flex-1" onClick={handleCreateClinic} disabled={isCreatingClinic}>
                {isCreatingClinic ? "جاري الإضافة..." : "إضافة"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setIsAddClinicOpen(false)} disabled={isCreatingClinic}>
                إلغاء
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
