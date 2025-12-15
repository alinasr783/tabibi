import { CalendarPlus, Search, Clock, CalendarDays, Filter, RefreshCw, Plus, Users, Calendar, CheckCircle, X, AlertCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "../../components/ui/button"
import { Card, CardContent } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import TableSkeleton from "../../components/ui/table-skeleton"
import { APPOINTMENTS_PAGE_SIZE } from "../../constants/pagination"
import AppointmentCreateDialog from "./AppointmentCreateDialog"
import AppointmentsFilter from "./AppointmentsFilter"
import AppointmentsTable from "./AppointmentsTable"
import useAppointments from "./useAppointments"
import OnlineBookingsSection from "./OnlineBookingsSection"
import OnlineBookingsTable from "../online-booking/OnlineBookingsTable"
import { useNavigate } from "react-router-dom"

export default function CalendarPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [allAppointmentsPage, setAllAppointmentsPage] = useState(1)
  const [filters, setFilters] = useState({})
  const [open, setOpen] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [activeTab, setActiveTab] = useState("upcoming")
  
  // Fetch upcoming appointments
  const { 
    data: upcomingData, 
    isLoading: isUpcomingLoading,
    refetch: refetchUpcoming 
  } = useAppointments(query, page, APPOINTMENTS_PAGE_SIZE, { status: "upcoming" })
  
  // Fetch all appointments
  const { 
    data: allData, 
    isLoading: isAllLoading,
    refetch: refetchAll 
  } = useAppointments(query, allAppointmentsPage, APPOINTMENTS_PAGE_SIZE, filters)
  
  // Fetch online bookings (similar to OnlineBookingsSection)
  const { 
    data: onlineBookingsData, 
    isLoading: isOnlineBookingsLoading,
    refetch: refetchOnlineBookings 
  } = useAppointments("", 1, 100, { from: "booking" })

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
    setPage(1)
    setAllAppointmentsPage(1)
  }
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([refetchUpcoming(), refetchAll()])
    setTimeout(() => setIsRefreshing(false), 500)
  }

  // Auto-refresh every 10 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      refetchUpcoming()
      refetchAll()
    }, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [refetchUpcoming, refetchAll])

  // Stats calculations
  const today = new Date().toISOString().split('T')[0]
  const todayAppointments = upcomingData?.items?.filter(a => a.date === today) || []
  const completedToday = todayAppointments.filter(a => a.status === 'completed').length
  const pendingToday = todayAppointments.filter(a => a.status === 'pending' || a.status === 'confirmed').length
  
  const stats = {
    today: todayAppointments.length,
    completedToday,
    pendingToday,
    upcoming: upcomingData?.total || 0,
    total: allData?.total || 0
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6" dir="rtl">
      <div className="max-w-[1920px] mx-auto">
        {/* Header Section - Completely Redesigned */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            {/* Left Side - Title and Info */}
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-white border border-gray-200 shadow-sm">
                  <CalendarPlus className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">إدارة المواعيد</h1>
                  <div className="flex flex-wrap items-center gap-4 text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">{new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">{stats.today} موعد اليوم</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Stats Overview */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 mb-1">{stats.today}</div>
                  <div className="text-sm text-gray-500 flex items-center justify-center gap-1">
                    <Calendar className="w-4 h-4" />
                    اليوم
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 mb-1">{stats.completedToday}</div>
                  <div className="text-sm text-gray-500 flex items-center justify-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    مكتمل
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600 mb-1">{stats.pendingToday}</div>
                  <div className="text-sm text-gray-500 flex items-center justify-center gap-1">
                    <Clock className="w-4 h-4" />
                    قيد الانتظار
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 mb-1">{stats.upcoming}</div>
                  <div className="text-sm text-gray-500 flex items-center justify-center gap-1">
                    <CalendarDays className="w-4 h-4" />
                    قادمة
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            {/* Search and Actions */}
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    className="w-full pr-10 h-11 bg-white border-gray-300 focus:border-blue-500"
                    placeholder="ابحث عن موعد بمريض، رقم هاتف، أو تاريخ..."
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value)
                      setPage(1)
                      setAllAppointmentsPage(1)
                    }}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => setOpen(true)}
                    className="h-11 bg-blue-600 hover:bg-blue-700 text-white px-6"
                  >
                    <Plus className="w-5 h-5 ml-2" />
                    موعد جديد
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => navigate("/work-mode")}
                    className="h-11 border-gray-300 hover:bg-gray-50"
                  >
                    <Calendar className="w-4 h-4 ml-2" />
                    وضع العمل
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="h-11 border-gray-300 hover:bg-gray-50"
                  >
                    <Filter className="w-4 h-4 ml-2" />
                    {showFilters ? 'إخفاء الفلاتر' : 'فلاتر'}
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={handleRefresh}
                    className="h-11 border-gray-300 hover:bg-gray-50"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mb-6 animate-in fade-in duration-200">
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">تصفية المواعيد</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFilters(false)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <AppointmentsFilter onFilterChange={handleFilterChange} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Online Bookings */}
        <div className="mb-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">المواعيد الأونلاين</h2>
                  <p className="text-sm text-gray-500">المواعيد القادمة من الموقع</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={refetchOnlineBookings}
                className="h-9 gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4" />
                تحديث
              </Button>
            </div>

            {/* Info box for pending appointments */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700">
                الحجوزات الجديدة (الحالة: جديد) تظهر في أعلى القائمة تلقائيًا لتسهيل الإجراءات السريعة
              </p>
            </div>

            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-0">
                {isOnlineBookingsLoading ? (
                  <div className="p-6">
                    <TableSkeleton columns={4} rows={3} />
                  </div>
                ) : onlineBookingsData?.items?.length > 0 ? (
                  <OnlineBookingsTable
                    appointments={onlineBookingsData.items}
                  />
                ) : (
                  <div className="p-8 text-center">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 mb-2">لا توجد مواعيد أونلاين</p>
                    <p className="text-sm text-gray-400">سيتم عرض المواعيد القادمة من الموقع هنا</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content Area */}
        <Card className="border border-gray-200 shadow-sm">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab("upcoming")}
                className={`px-6 py-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "upcoming"
                    ? "border-blue-600 text-blue-600 bg-blue-50"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  المواعيد القادمة
                  {stats.upcoming > 0 && (
                    <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full">
                      {stats.upcoming}
                    </span>
                  )}
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab("all")}
                className={`px-6 py-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "all"
                    ? "border-blue-600 text-blue-600 bg-blue-50"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  جميع المواعيد
                  {stats.total > 0 && (
                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                      {stats.total}
                    </span>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            {activeTab === "upcoming" ? (
              isUpcomingLoading ? (
                <TableSkeleton columns={6} rows={6} />
              ) : upcomingData?.items?.length > 0 ? (
                <div className="overflow-x-auto">
                  <AppointmentsTable
                    appointments={upcomingData.items}
                    total={upcomingData.total}
                    page={page}
                    pageSize={APPOINTMENTS_PAGE_SIZE}
                    onPageChange={setPage}
                    fullWidth={true}
                  />
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                    <Clock className="w-8 h-8 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">لا توجد مواعيد قادمة</h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">لا توجد مواعيد مجدولة في الوقت الحالي</p>
                  <Button
                    onClick={() => setOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="w-4 h-4 ml-2" />
                    إضافة أول موعد
                  </Button>
                </div>
              )
            ) : (
              isAllLoading ? (
                <TableSkeleton columns={6} rows={6} />
              ) : allData?.items?.length > 0 ? (
                <div className="overflow-x-auto">
                  <AppointmentsTable
                    appointments={allData.items}
                    total={allData.total}
                    page={allAppointmentsPage}
                    pageSize={APPOINTMENTS_PAGE_SIZE}
                    onPageChange={setAllAppointmentsPage}
                    fullWidth={true}
                  />
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <CalendarDays className="w-8 h-8 text-gray-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">لا توجد مواعيد</h3>
                  <p className="text-gray-500 mb-6">ابدأ بإضافة مواعيد جديدة</p>
                  <Button
                    onClick={() => setOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="w-4 h-4 ml-2" />
                    إضافة موعد جديد
                  </Button>
                </div>
              )
            )}
          </div>
        </Card>

        {/* Mobile Floating Button */}
        <Button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 left-6 md:hidden h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg z-40"
          size="icon"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* Create Appointment Dialog */}
      <AppointmentCreateDialog open={open} onClose={() => setOpen(false)} />
    </div>
  )
}