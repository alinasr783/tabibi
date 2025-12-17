import { useEffect, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Card } from "../../components/ui/card"
import { useAuth } from "../auth/AuthContext"
import useClinic from "../auth/useClinic"
import useClinicSecretaries from "./useClinicSecretaries"
import useUpdateSecretaryPermissions from "./useUpdateSecretaryPermissions"
import useUpdateClinic from "./useUpdateClinic"
import ClinicInfoForm from "./ClinicInfoForm"
import SecretsSection from "./SecretsSection"
import { initializeAvailableTime } from "./clinicUtils"
import { Settings, Users, ArrowLeft } from "lucide-react"
import { Button } from "../../components/ui/button"

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

  const { mutate: updatePermissions } = useUpdateSecretaryPermissions()
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

  const handleUpdatePermissions = (secretaryId, permissions) => {
    updatePermissions({ secretaryId, permissions })
  }

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
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 pb-20 md:pb-0">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="h-10 w-10 rounded-full bg-white shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">إدارة العيادة</h1>
              <p className="text-gray-500 mt-1">عدل معلومات عيادتك وادار السكرتارية</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Clinic Info Card */}
          <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
            <div className="border-b border-gray-100 p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Settings className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">معلومات العيادة</h2>
                  <p className="text-gray-500 text-sm">بيانات العيادة الأساسية</p>
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

          {/* Secretaries Section */}
          {/* <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
            <div className="border-b border-gray-100 p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">السكرتارية</h2>
                  <p className="text-gray-500 text-sm">ادارة فريق السكرتارية</p>
                </div>
              </div>
            </div>
            
            <SecretsSection
              secretaries={secretaries}
              isSecretariesLoading={isSecretariesLoading}
              isSecretariesError={isSecretariesError}
              onUpdatePermissions={handleUpdatePermissions}
            />
          </Card> */}
        </div>

        {/* Bottom Info */}
        <div className="mt-8 p-4 bg-white rounded-xl border border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-1">معلومات مهمة</h3>
              <p className="text-sm text-gray-500">
                أي تغيير تحفظه هيظهر على صفحة الحجز بتاعت المرضى
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => window.open(`/booking/${user?.clinic_id}`, '_blank')}
              className="border-blue-300 text-blue-600 hover:bg-blue-50"
            >
              شوف صفحة الحجز
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}