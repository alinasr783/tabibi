import { CalendarPlus, Search, Clock, CalendarDays, Filter, RefreshCw, Plus, Users, Calendar, CheckCircle, X, AlertCircle } from "lucide-react"
import { useEffect, useState, useMemo } from "react"
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
import useScrollToTop from "../../hooks/useScrollToTop"

export default function CalendarPage() {
  useScrollToTop(); // Auto scroll to top on page load
  const navigate = useNavigate();
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [allAppointmentsPage, setAllAppointmentsPage] = useState(1)
  const [filters, setFilters] = useState({})
  const [open, setOpen] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [activeTab, setActiveTab] = useState("upcoming")
  const [isRefreshing, setIsRefreshing] = useState(false) // Add missing state
  
  // Fetch upcoming appointments
  const { 
    data: upcomingData, 
    isLoading: isUpcomingLoading,
    refetch: refetchUpcoming,
    isError: isUpcomingError 
  } = useAppointments(query, page, APPOINTMENTS_PAGE_SIZE, { time: "upcoming" })
  
  // Fetch all appointments
  const { 
    data: allData, 
    isLoading: isAllLoading,
    refetch: refetchAll,
    isError: isAllError 
  } = useAppointments(query, allAppointmentsPage, APPOINTMENTS_PAGE_SIZE, filters)
  
  // Fetch online bookings (similar to OnlineBookingsSection)
  const { 
    data: onlineBookingsData, 
    isLoading: isOnlineBookingsLoading,
    refetch: refetchOnlineBookings 
  } = useAppointments("", 1, 100, { source: "booking" })

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
    setPage(1)
    setAllAppointmentsPage(1)
    // Switch to "all" tab when filter is applied
    setActiveTab("all")
  }
  
  // Auto-switch to "all" tab when searching
  useEffect(() => {
    if (query) {
      setActiveTab("all")
    }
  }, [query])

  // Fetch today's appointments specifically for stats
  const todayFilter = useMemo(() => {
    // Get local date string in YYYY-MM-DD format
    const localDate = new Date().toLocaleDateString('en-CA')
    return { date: localDate }
  }, [])

  const { 
    data: todayStatsData,
    refetch: refetchTodayStats 
  } = useAppointments("", 1, 2000, todayFilter)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([refetchUpcoming(), refetchAll(), refetchTodayStats()])
    setTimeout(() => setIsRefreshing(false), 500)
  }

  // Auto-refresh every 10 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      refetchUpcoming()
      refetchAll()
      refetchTodayStats()
    }, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [refetchUpcoming, refetchAll, refetchTodayStats])

  // Stats calculations
  const todayAppointments = todayStatsData?.data || []
  
  const completedToday = todayAppointments.filter(a => {
    const status = a.status?.toLowerCase()?.trim();
    return ['completed', 'done', 'finish', 'finished'].includes(status);
  }).length

  const pendingToday = todayAppointments.filter(a => {
    const status = a.status?.toLowerCase()?.trim();
    return ['pending', 'confirmed'].includes(status);
  }).length
  
  const stats = {
    today: todayStatsData?.count || 0,
    completedToday,
    pendingToday,
    upcoming: upcomingData?.count || 0,
    total: allData?.count || 0
  }

  if (isUpcomingError || isAllError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <AlertCircle className="w-16 h-16 text-destructive" />
        <h2 className="text-xl font-bold">فشل في تحميل المواعيد</h2>
        <p className="text-muted-foreground">حدث خطأ أثناء الاتصال بقاعدة البيانات. يرجى تحديث الصفحة أو التحقق من الصلاحيات.</p>
        <Button onClick={handleRefresh} variant="outline">
          إعادة المحاولة
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6" dir="rtl">
      <div className="max-w-[1920px] mx-auto">
        {/* Header Section - Dashboard Style */}
        <div className="mb-6">
          <div className="flex flex-col gap-4">
            {/* Title Section */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                <CalendarPlus className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-foreground">إدارة المواعيد</h1>
                <p className="text-sm text-muted-foreground">
                  {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Stats Overview - Dashboard Style Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-card/70">
                <CardContent className="flex items-center gap-3 py-3">
                  <div className="size-8 rounded-[calc(var(--radius)-4px)] bg-primary/10 text-primary grid place-items-center">
                    <Calendar className="size-4" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">اليوم</div>
                    <div className="text-lg font-semibold">{stats.today}</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-card/70">
                <CardContent className="flex items-center gap-3 py-3">
                  <div className="size-8 rounded-[calc(var(--radius)-4px)] bg-green-500/10 text-green-600 grid place-items-center">
                    <CheckCircle className="size-4" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">مكتمل</div>
                    <div className="text-lg font-semibold text-green-600">{stats.completedToday}</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-card/70">
                <CardContent className="flex items-center gap-3 py-3">
                  <div className="size-8 rounded-[calc(var(--radius)-4px)] bg-amber-500/10 text-amber-600 grid place-items-center">
                    <Clock className="size-4" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">منتظر</div>
                    <div className="text-lg font-semibold text-amber-600">{stats.pendingToday}</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-card/70">
                <CardContent className="flex items-center gap-3 py-3">
                  <div className="size-8 rounded-[calc(var(--radius)-4px)] bg-blue-500/10 text-blue-600 grid place-items-center">
                    <CalendarDays className="size-4" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">قادمة</div>
                    <div className="text-lg font-semibold text-blue-600">{stats.upcoming}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Quick Actions Bar - Mobile Optimized */}
        <div className="mb-4">
          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 md:w-5 md:h-5" />
            <Input
              className="w-full pr-10 h-10 md:h-11 bg-background border-border focus:border-primary text-sm md:text-base"
              placeholder="ابحث عن موعد..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
                setAllAppointmentsPage(1)
              }}
            />
          </div>
          
          {/* Action Buttons - Mobile Grid */}
          <div className="grid grid-cols-2 md:flex gap-2">
            <Button
              onClick={() => setOpen(true)}
              className="h-10 md:h-11 bg-primary hover:bg-primary/90 text-primary-foreground text-sm md:text-base col-span-2 md:col-span-1"
            >
              <Plus className="w-4 h-4 md:w-5 md:h-5 ml-2" />
              موعد جديد
            </Button>
            
            <Button
              variant="outline"
              onClick={() => navigate("/work-mode")}
              className="h-10 md:h-11 text-sm md:text-base flex-1"
            >
              <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 ml-1 md:ml-2" />
              <span className="hidden sm:inline">وضع العمل</span>
              <span className="sm:hidden">العمل</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="h-10 md:h-11 text-sm md:text-base flex-1"
            >
              <Filter className="w-3.5 h-3.5 md:w-4 md:h-4 ml-1 md:ml-2" />
              <span className="hidden sm:inline">{showFilters ? 'إخفاء' : 'فلاتر'}</span>
              <span className="sm:hidden">فلتر</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={handleRefresh}
              className="h-10 md:h-11 col-span-2 md:w-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mb-6 animate-in fade-in duration-200">
            <Card className="bg-card/70">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-[calc(var(--radius)-4px)] bg-primary/10 text-primary grid place-items-center">
                      <Filter className="size-4" />
                    </div>
                    <h3 className="font-semibold text-foreground">تصفية المواعيد</h3>
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

        {/* Tabs - Modern Style matching Clinic Page */}
        <div className="w-full mb-6">
          <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground w-full">
            <button
              onClick={() => setActiveTab("upcoming")}
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-1 ${
                activeTab === "upcoming"
                  ? "bg-background text-foreground shadow-sm"
                  : "hover:bg-background/50 hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>المواعيد القادمة</span>
                {stats.upcoming > 0 && (
                  <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full mr-1">
                    {stats.upcoming}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-1 ${
                activeTab === "all"
                  ? "bg-background text-foreground shadow-sm"
                  : "hover:bg-background/50 hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                <span>جميع المواعيد</span>
                {stats.total > 0 && (
                  <span className="bg-muted text-foreground text-xs px-2 py-0.5 rounded-full mr-1">
                    {stats.total}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Content */}
        <Card className="bg-card/70 mb-4 md:mb-6">
          <div className="p-0 md:p-4">
            {activeTab === "upcoming" ? (
              isUpcomingLoading ? (
                <div className="p-4">
                  <TableSkeleton columns={6} rows={6} />
                </div>
              ) : (upcomingData?.data || []).length > 0 ? (
                <AppointmentsTable
                  appointments={upcomingData.data}
                  total={upcomingData.count}
                  page={page}
                  pageSize={APPOINTMENTS_PAGE_SIZE}
                  onPageChange={setPage}
                  fullWidth={true}
                />
              ) : (
                <div className="text-center py-8 md:py-12 px-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                  </div>
                  <h3 className="text-base md:text-lg font-semibold text-foreground mb-2">مفيش مواعيد قادمة</h3>
                  <p className="text-muted-foreground mb-4 md:mb-6 text-sm md:text-base">مفيش مواعيد مجدولة دلوقتي</p>
                  <Button
                    onClick={() => setOpen(true)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 ml-2" />
                    ضيف أول موعد
                  </Button>
                </div>
              )
            ) : (
              isAllLoading ? (
                <div className="p-4">
                  <TableSkeleton columns={6} rows={6} />
                </div>
              ) : (allData?.data || []).length > 0 ? (
                <AppointmentsTable
                  appointments={allData.data}
                  total={allData.count}
                  page={allAppointmentsPage}
                  pageSize={APPOINTMENTS_PAGE_SIZE}
                  onPageChange={setAllAppointmentsPage}
                  fullWidth={true}
                />
              ) : (
                <div className="text-center py-8 md:py-12 px-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 rounded-lg bg-accent flex items-center justify-center">
                    <CalendarDays className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-base md:text-lg font-semibold text-foreground mb-2">مفيش مواعيد</h3>
                  <p className="text-muted-foreground mb-4 md:mb-6 text-sm md:text-base">ابدأ بإضافة مواعيد جديدة</p>
                  <Button
                    onClick={() => setOpen(true)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 ml-2" />
                    ضيف موعد
                  </Button>
                </div>
              )
            )}
          </div>
        </Card>

        {/* Online Bookings - Moved below main tables */}
        <div className="mt-4 md:mt-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-green-500/10 text-green-600">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base md:text-lg font-semibold text-foreground">مواعيد أونلاين</h2>
                  <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">الحجوزات من الموقع</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={refetchOnlineBookings}
                className="h-8 md:h-9 gap-1 md:gap-2 text-xs md:text-sm"
                size="sm"
              >
                <RefreshCw className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">تحديث</span>
              </Button>
            </div>

            {/* Info box */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2.5 md:p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs md:text-sm text-blue-700">
                الحجوزات الجديدة من النت بتظهر هنا
              </p>
            </div>

            <Card className="bg-card/70">
              <CardContent className="p-0">
                {isOnlineBookingsLoading ? (
                  <div className="p-4 md:p-6">
                    <TableSkeleton columns={4} rows={3} />
                  </div>
                ) : (onlineBookingsData?.data || []).length > 0 ? (
                  <OnlineBookingsTable
                    appointments={onlineBookingsData.data}
                  />
                ) : (
                  <div className="p-6 md:p-8 text-center">
                    <Calendar className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground/50 mx-auto mb-2 md:mb-3" />
                    <p className="text-muted-foreground mb-1 md:mb-2 text-sm md:text-base">مفيش حجوزات</p>
                    <p className="text-xs md:text-sm text-muted-foreground/70">هتظهر هنا لما تيجي</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Mobile Floating Button */}
        <Button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 left-6 md:hidden h-14 w-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg z-40"
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
