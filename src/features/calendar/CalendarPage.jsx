import { CalendarPlus, Search, Clock, CalendarDays, Filter, RefreshCw, Plus, Users, Calendar, CheckCircle, X, AlertCircle, Zap, TrendingUp, Star } from "lucide-react"
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
import { useNavigate, useLocation } from "react-router-dom"

export default function CalendarPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [allAppointmentsPage, setAllAppointmentsPage] = useState(1)
  const [filters, setFilters] = useState({})
  const [open, setOpen] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [activeTab, setActiveTab] = useState("upcoming")
  const [isRefreshing, setIsRefreshing] = useState(false) // Add missing state
  
  // Apply scroll to top on route changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  
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
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 pb-20 md:pb-0" dir="rtl">
      <div className="max-w-[1920px] mx-auto">
        {/* Header Section - Completely Redesigned */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                  <CalendarPlus className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">إدارة المواعيد</h1>
                  <p className="text-gray-500">سهولة التحكم في كل حجوزاتك</p>
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
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        {showFilters && (
          <div className="mb-6">
            <AppointmentsFilter onFilterChange={handleFilterChange} />
          </div>
        )}

        {/* Modern Tab Navigation */}
        <div className="mb-6 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex flex-wrap">
            <button
              className={`flex-1 py-4 px-6 text-center transition-all font-medium ${
                activeTab === "upcoming"
                  ? "text-blue-600 border-b-2 border-blue-500 bg-blue-50"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
              onClick={() => {
                setActiveTab("upcoming")
                setPage(1)
              }}
            >
              <div className="flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />
                <span>القادمة</span>
                {stats.upcoming > 0 && (
                  <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full">
                    {stats.upcoming}
                  </span>
                )}
              </div>
            </button>
            
            <button
              className={`flex-1 py-4 px-6 text-center transition-all font-medium ${
                activeTab === "all"
                  ? "text-blue-600 border-b-2 border-blue-500 bg-blue-50"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
              onClick={() => {
                setActiveTab("all")
                setAllAppointmentsPage(1)
              }}
            >
              <div className="flex items-center justify-center gap-2">
                <CalendarDays className="w-4 h-4" />
                <span>كل المواعيد</span>
                {stats.total > 0 && (
                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                    {stats.total}
                  </span>
                )}
              </div>
            </button>
            
            <button
              className={`flex-1 py-4 px-6 text-center transition-all font-medium ${
                activeTab === "bookings"
                  ? "text-blue-600 border-b-2 border-blue-500 bg-blue-50"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
              onClick={() => setActiveTab("bookings")}
            >
              <div className="flex items-center justify-center gap-2">
                <Users className="w-4 h-4" />
                <span>الحجوزات الإلكترونية</span>
                {onlineBookingsData?.items?.length > 0 && (
                  <span className="bg-amber-100 text-amber-600 text-xs px-2 py-1 rounded-full">
                    {onlineBookingsData.items.length}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === "upcoming" && (
          <div>
            {isUpcomingLoading ? (
              <TableSkeleton />
            ) : (
              <AppointmentsTable
                appointments={upcomingData?.items || []}
                total={upcomingData?.total || 0}
                page={page}
                pageSize={APPOINTMENTS_PAGE_SIZE}
                onPageChange={setPage}
                isLoading={isUpcomingLoading}
              />
            )}
          </div>
        )}

        {activeTab === "all" && (
          <div>
            {isAllLoading ? (
              <TableSkeleton />
            ) : (
              <AppointmentsTable
                appointments={allData?.items || []}
                total={allData?.total || 0}
                page={allAppointmentsPage}
                pageSize={APPOINTMENTS_PAGE_SIZE}
                onPageChange={setAllAppointmentsPage}
                isLoading={isAllLoading}
              />
            )}
          </div>
        )}

        {activeTab === "bookings" && (
          <div>
            {isOnlineBookingsLoading ? (
              <TableSkeleton />
            ) : (
              <OnlineBookingsTable
                bookings={onlineBookingsData?.items || []}
                total={onlineBookingsData?.total || 0}
                page={1}
                pageSize={100}
                onPageChange={() => {}}
                isLoading={isOnlineBookingsLoading}
              />
            )}
          </div>
        )}

        {/* Floating Quick Action Button for Mobile */}
        <Button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 md:hidden h-14 w-14 rounded-full shadow-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 z-40"
          size="icon"
        >
          <Plus className="w-6 h-6" />
        </Button>

        {/* Appointment Create Dialog */}
        <AppointmentCreateDialog open={open} onClose={() => setOpen(false)} />
      </div>
    </div>
  );
}