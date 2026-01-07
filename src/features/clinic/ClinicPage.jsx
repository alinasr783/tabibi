import { useEffect, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Card } from "../../components/ui/card"
import { useAuth } from "../auth/AuthContext"
import useClinic from "../auth/useClinic"
import useClinicSecretaries from "./useClinicSecretaries"
import useUpdateClinic from "./useUpdateClinic"
import ClinicInfoForm from "./ClinicInfoForm"
import SecretsSection from "./SecretsSection"
import { initializeAvailableTime } from "./clinicUtils"
import { Settings, Users, Info, ExternalLink } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"

export default function ClinicPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  
  // Apply scroll to top on route changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const {
    data: clinic,
    isLoading: isClinicLoading,
    isError: isClinicError,
  } = useClinic()

  const {
    data: secretaries,
    isLoading: isSecretariesLoading,
    isError: isSecretariesError,
  } = useClinicSecretaries(user?.clinic_id)

  const { mutate: updateClinic, isPending: isUpdating } = useUpdateClinic()

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

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6 pb-20 md:pb-6 w-full max-w-full overflow-x-hidden" dir="rtl">
      <div className="max-w-4xl mx-auto w-full" style={{ direction: 'rtl' }}>
        {/* Header */}
        <div className="mb-4 sm:mb-5 md:mb-6">
          <div className="flex items-center gap-2 sm:gap-3 md:gap-3 mb-3 sm:mb-4 md:mb-4">
            <div className="p-1.5 sm:p-2 md:p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
              <Settings className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 flex-shrink-0" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground leading-tight">
                العيادة
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                عدل معلومات عيادتك
              </p>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <Tabs defaultValue="clinic-info" className="w-full mb-4 sm:mb-6" style={{ direction: 'rtl' }}>
          <TabsList className="grid grid-cols-2 w-full h-auto p-1 sm:p-1.5 bg-muted/50 rounded-lg">
            <TabsTrigger 
              value="clinic-info" 
              className="text-xs sm:text-sm py-2.5 sm:py-3 px-2 data-[state=active]:bg-background rounded-md transition-all duration-200"
            >
              <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span>معلومات العيادة</span>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="secretaries" 
              className="text-xs sm:text-sm py-2.5 sm:py-3 px-2 data-[state=active]:bg-background rounded-md transition-all duration-200"
            >
              <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span>الموظفين</span>
              </div>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="clinic-info" className="mt-4 sm:mt-6">
            <Card className="bg-card/70 w-full overflow-hidden border border-border/50 shadow-sm">
              <div className="border-b border-border/50 p-3 sm:p-4 md:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                    <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 flex-shrink-0" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base sm:text-lg md:text-lg font-bold text-foreground leading-tight">
                      معلومات العيادة
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      بيانات العيادة الأساسية
                    </p>
                  </div>
                </div>
              </div>
              
              <ClinicInfoForm
                clinicFormData={clinicFormData}
                isClinicLoading={isClinicLoading}
                isClinicError={isClinicError}
                isUpdating={isUpdating}
                onClinicChange={handleClinicChange}
                onTimeChange={handleTimeChange}
                onDayToggle={toggleDayOff}
                onSubmit={handleUpdateClinic}
                clinicId={user?.clinic_id}
              />
            </Card>
          </TabsContent>
          
          <TabsContent value="secretaries" className="mt-4 sm:mt-6">
            <Card className="bg-card/70 w-full overflow-hidden border border-border/50 shadow-sm">
              <div className="border-b border-border/50 p-3 sm:p-4 md:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
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
        </Tabs>

        {/* Bottom Info */}
        <div className="mt-4 sm:mt-6 md:mt-8 p-3 sm:p-4 md:p-4 bg-card/70 rounded-xl border border-border/50 shadow-sm w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="p-1.5 sm:p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex-shrink-0">
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
              onClick={() => window.open(`/booking/${user?.clinic_id}`, '_blank')}
              className="border-primary/20 text-primary hover:bg-primary/10 w-full sm:w-auto text-xs sm:text-sm py-2.5 sm:py-3 min-h-[40px] gap-2"
            >
              <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              شوف صفحة الحجز
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
