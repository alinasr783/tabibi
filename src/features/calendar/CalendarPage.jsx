import { CalendarPlus, Search, Clock, CalendarDays, Filter, RefreshCw, Plus, User, Zap, TrendingUp, Star, X } from "lucide-react"
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

export default function CalendarPage() {
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [allAppointmentsPage, setAllAppointmentsPage] = useState(1)
  const [filters, setFilters] = useState({})
  const [open, setOpen] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState("upcoming")
  
  // Fetch appointments
  const { 
    data: upcomingData, 
    isLoading: isUpcomingLoading, 
    refetch: refetchUpcoming 
  } = useAppointments(query, page, APPOINTMENTS_PAGE_SIZE, { status: "upcoming" })
  
  const { 
    data: allData, 
    isLoading: isAllLoading, 
    refetch: refetchAll 
  } = useAppointments(query, allAppointmentsPage, APPOINTMENTS_PAGE_SIZE, filters)

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

  const stats = {
    today: upcomingData?.items?.filter(a => a.date === new Date().toISOString().split('T')[0])?.length || 0,
    upcoming: upcomingData?.total || 0,
    total: allData?.total || 0
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/20 p-3 md:p-5" dir="rtl">
      {/* Main Content */}
      <div className="max-w-[1920px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                  <CalendarPlus className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">إدارة المواعيد</h1>
                  <p className="text-gray-500">سهولة التحكم في كل حجز</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setOpen(true)}
                className="h-12 gap-3 bg-gradient-to-l from-blue-500 via-blue-600 to-blue-500 bg-[length:200%] hover:bg-[length:100%] transition-all duration-500 text-white shadow-lg hover:shadow-xl rounded-xl px-6"
              >
                <Plus className="w-5 h-5" />
                <span className="font-semibold">موعد جديد</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Grid - Modern */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
          <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 rounded-md bg-blue-50">
                <Zap className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">اليوم</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{stats.today}</div>
            <p className="text-gray-500 text-[10px]">موعد لهذا اليوم</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 rounded-md bg-green-50">
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <span className="text-[10px] font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">قادمة</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{stats.upcoming}</div>
            <p className="text-gray-500 text-[10px]">موعد في المستقبل</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 rounded-md bg-purple-50">
                <Star className="w-4 h-4 text-purple-600" />
              </div>
              <span className="text-[10px] font-medium text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full">المجموع</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{stats.total}</div>
            <p className="text-gray-500 text-[10px]">موعد إجمالي</p>
          </div>
        </div>

        {/* Search & Quick Actions */}
        <div className="flex flex-col lg:flex-row gap-6 mb-8">
          {/* Search Bar */}
          <div className="lg:w-2/5">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl blur opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
              <div className="relative bg-white rounded-2xl border border-gray-200 shadow-sm hover:border-blue-300 transition-colors">
                <div className="p-1">
                  <div className="relative">
                    <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      className="w-full pr-12 h-14 text-lg border-0 focus:ring-0 placeholder:text-gray-400 bg-transparent"
                      placeholder="اكتب اسم المريض أو رقم الهاتف أو التاريخ..."
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value)
                        setPage(1)
                        setAllAppointmentsPage(1)
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Quick Actions Row */}
            <div className="flex flex-wrap gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="h-11 gap-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 rounded-xl"
              >
                <Filter className="w-4 h-4" />
                {showFilters ? 'إغلاق الفلتر' : 'فتح الفلتر'}
              </Button>
              
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-11 gap-2 border-gray-200 hover:border-green-300 hover:bg-green-50 rounded-xl"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                تحديث
              </Button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="lg:w-3/5">
              <Card className="border-0 shadow-lg rounded-2xl animate-in slide-in-from-bottom-4">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-100">
                        <Filter className="w-5 h-5 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">تصفية المواعيد</h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowFilters(false)}
                      className="h-8 w-8 p-0 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <AppointmentsFilter onFilterChange={handleFilterChange} />
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Online Bookings - Slim Version */}
        <div className="mb-8">
          <OnlineBookingsSection />
        </div>

        {/* Main Appointments Area - Full Width */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setActiveTab("upcoming")}
              className={`flex-1 py-5 px-6 text-center transition-all ${
                activeTab === "upcoming"
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-center gap-3">
                <Clock className="w-5 h-5" />
                <span className="font-semibold text-lg">القادمة</span>
                {stats.upcoming > 0 && (
                  <span className="bg-blue-100 text-blue-600 text-sm px-3 py-1 rounded-full">
                    {stats.upcoming}
                  </span>
                )}
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab("all")}
              className={`flex-1 py-5 px-6 text-center transition-all ${
                activeTab === "all"
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-center gap-3">
                <CalendarDays className="w-5 h-5" />
                <span className="font-semibold text-lg">كل المواعيد</span>
                {stats.total > 0 && (
                  <span className="bg-gray-100 text-gray-600 text-sm px-3 py-1 rounded-full">
                    {stats.total}
                  </span>
                )}
              </div>
            </button>
          </div>

          {/* Content Area - Full Width */}
          <div className="w-full">
            {activeTab === "upcoming" ? (
              isUpcomingLoading ? (
                <div className="p-8">
                  <TableSkeleton columns={6} rows={8} />
                </div>
              ) : upcomingData?.items?.length > 0 ? (
                <div className="w-full overflow-x-auto">
                  <div className="min-w-full">
                    <AppointmentsTable
                      appointments={upcomingData.items}
                      total={upcomingData.total}
                      page={page}
                      pageSize={APPOINTMENTS_PAGE_SIZE}
                      onPageChange={setPage}
                      fullWidth={true}
                    />
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
                    <Clock className="w-12 h-12 text-blue-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-700 mb-3">مافيش مواعيد قادمة</h3>
                  <p className="text-gray-500 mb-8 max-w-md mx-auto">ماحصلش حجوزات قادمة دلوقتي. ممكن تضيف مواعيد جديدة</p>
                  <Button
                    onClick={() => setOpen(true)}
                    className="h-14 px-8 text-lg bg-gradient-to-l from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl"
                  >
                    <Plus className="w-6 h-6 ml-2" />
                    ابدأ بحجز جديد
                  </Button>
                </div>
              )
            ) : (
              isAllLoading ? (
                <div className="p-8">
                  <TableSkeleton columns={6} rows={8} />
                </div>
              ) : allData?.items?.length > 0 ? (
                <div className="w-full overflow-x-auto">
                  <div className="min-w-full">
                    <AppointmentsTable
                      appointments={allData.items}
                      total={allData.total}
                      page={allAppointmentsPage}
                      pageSize={APPOINTMENTS_PAGE_SIZE}
                      onPageChange={setAllAppointmentsPage}
                      fullWidth={true}
                    />
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                    <CalendarDays className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-700 mb-3">مافيش مواعيد</h3>
                  <p className="text-gray-500 mb-8">لما تحجز مواعيد، هتظهر هنا. ابدأ دلوقتي</p>
                  <Button
                    onClick={() => setOpen(true)}
                    className="h-14 px-8 text-lg bg-gradient-to-l from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl"
                  >
                    <Plus className="w-6 h-6 ml-2" />
                    احجز أول موعد
                  </Button>
                </div>
              )
            )}
          </div>
        </div>

        {/* Floating Help Button */}
        
        {/* Quick Add Button for Mobile */}
        <Button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 md:hidden h-14 w-14 rounded-full shadow-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 z-40"
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