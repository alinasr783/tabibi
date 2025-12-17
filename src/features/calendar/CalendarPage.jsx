import { CalendarPlus, Search, Clock, CalendarDays, Filter, RefreshCw, Plus, Users, Calendar, CheckCircle, X, AlertCircle, Zap, TrendingUp, Star, ChevronLeft, ChevronRight, Menu, Phone, Mail, MessageSquare } from "lucide-react"
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
import { Badge } from "../../components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../../components/ui/sheet"

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
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
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

  // Responsive table scroll container
  const TableContainer = ({ children }) => (
    <div className="relative overflow-hidden">
      <div className="overflow-x-auto -mx-4 md:mx-0">
        <div className="min-w-[700px] md:min-w-0 px-4 md:px-0">
          {children}
        </div>
      </div>
      <div className="md:hidden text-center mt-2 text-sm text-gray-500">
        <span className="inline-flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" />
          اسحب لليمين لمشاهدة كل البيانات
          <ChevronRight className="w-4 h-4" />
        </span>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50/50 p-3 md:p-6 pb-20 md:pb-6" dir="rtl">
      <div className="max-w-[1920px] mx-auto">
        {/* Mobile Header */}
        <div className="md:hidden sticky top-0 z-30 bg-white border-b border-gray-200 -mx-3 px-3 py-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
                  <CalendarPlus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">المواعيد</h1>
                  <p className="text-xs text-gray-500">{stats.total} موعد</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={handleRefresh}
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                onClick={() => setOpen(true)}
                className="h-10 gap-2 bg-gradient-to-l from-blue-500 to-blue-600 text-white rounded-full px-4 shadow-lg"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">جديد</span>
              </Button>
            </div>
          </div>
          
          {/* Mobile Quick Stats */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
            <div className="flex-shrink-0 min-w-[120px] bg-gradient-to-l from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="text-blue-600 font-bold text-lg">{stats.today}</div>
                <div className="p-1.5 rounded-lg bg-white">
                  <Zap className="w-3.5 h-3.5 text-blue-600" />
                </div>
              </div>
              <div className="text-xs text-blue-700 mt-1 font-medium">اليوم</div>
            </div>
            
            <div className="flex-shrink-0 min-w-[120px] bg-gradient-to-l from-green-50 to-green-100 border border-green-200 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="text-green-600 font-bold text-lg">{stats.upcoming}</div>
                <div className="p-1.5 rounded-lg bg-white">
                  <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                </div>
              </div>
              <div className="text-xs text-green-700 mt-1 font-medium">قادمة</div>
            </div>
            
            <div className="flex-shrink-0 min-w-[120px] bg-gradient-to-l from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="text-purple-600 font-bold text-lg">{stats.total}</div>
                <div className="p-1.5 rounded-lg bg-white">
                  <Star className="w-3.5 h-3.5 text-purple-600" />
                </div>
              </div>
              <div className="text-xs text-purple-700 mt-1 font-medium">المجموع</div>
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                  <CalendarPlus className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">إدارة المواعيد</h1>
                  <p className="text-gray-500">سهولة التحكم في كل حجوزاتك</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <Zap className="w-3 h-3" />
                  {stats.today} موعد اليوم
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {stats.upcoming} قادمة
                </Badge>
              </div>
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

        {/* Desktop Stats Grid */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-l from-blue-50 to-white border border-blue-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-md">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="flex gap-2">
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                  ✓ {stats.completedToday}
                </Badge>
                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                  ⏱ {stats.pendingToday}
                </Badge>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">{stats.today}</div>
            <p className="text-gray-600 font-medium">مواعيد اليوم</p>
            <div className="mt-4 pt-4 border-t border-blue-100">
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="w-3.5 h-3.5 ml-1" />
                آخر تحديث: {new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-l from-green-50 to-white border border-green-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-md">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                قادمة
              </Badge>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">{stats.upcoming}</div>
            <p className="text-gray-600 font-medium">موعد في المستقبل</p>
            <div className="mt-4 pt-4 border-t border-green-100">
              <div className="text-sm text-gray-500">
                متابعة جميع المواعيد القادمة
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-l from-purple-50 to-white border border-purple-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-md">
                <Star className="w-5 h-5 text-white" />
              </div>
              <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">
                إجمالي
              </Badge>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">{stats.total}</div>
            <p className="text-gray-600 font-medium">موعد إجمالي</p>
            <div className="mt-4 pt-4 border-t border-purple-100">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <CalendarDays className="w-3.5 h-3.5" />
                جميع المواعيد المسجلة
              </div>
            </div>
          </div>
        </div>

        {/* Search and Actions Bar */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  className="w-full pr-12 h-12 md:h-11 bg-white border-gray-300 focus:border-blue-500 rounded-xl md:rounded-lg text-base md:text-sm"
                  placeholder="ابحث عن موعد، مريض، رقم هاتف..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setPage(1)
                    setAllAppointmentsPage(1)
                  }}
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
              <Button
                variant="outline"
                onClick={() => navigate("/work-mode")}
                className="h-12 md:h-11 border-gray-300 hover:bg-gray-50 rounded-xl md:rounded-lg flex-shrink-0 gap-2 px-4"
              >
                <Calendar className="w-4 h-4" />
                <span className="hidden md:inline">وضع العمل</span>
                <span className="md:hidden">العمل</span>
              </Button>
              
              <Button
                variant={showFilters ? "default" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
                className="h-12 md:h-11 border-gray-300 hover:bg-gray-50 rounded-xl md:rounded-lg flex-shrink-0 gap-2 px-4"
              >
                <Filter className="w-4 h-4" />
                <span className="hidden md:inline">فلاتر</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={handleRefresh}
                className="h-12 md:h-11 border-gray-300 hover:bg-gray-50 rounded-xl md:rounded-lg flex-shrink-0 gap-2 px-4"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden md:inline">تحديث</span>
              </Button>
              
              <Button
                onClick={() => setOpen(true)}
                className="hidden md:flex h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-lg gap-2 px-6"
              >
                <Plus className="w-4 h-4" />
                موعد جديد
              </Button>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        {showFilters && (
          <div className="mb-6 animate-in fade-in duration-300">
            <AppointmentsFilter onFilterChange={handleFilterChange} />
          </div>
        )}

        {/* Modern Tab Navigation */}
        <div className="mb-6">
          <div className="md:hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 rounded-xl bg-gray-100 p-1">
                <TabsTrigger value="upcoming" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <div className="flex items-center gap-2 py-2">
                    <Clock className="w-4 h-4" />
                    <span>القادمة</span>
                    {stats.upcoming > 0 && (
                      <Badge className="h-5 px-1.5 bg-blue-100 text-blue-700 hover:bg-blue-100">
                        {stats.upcoming}
                      </Badge>
                    )}
                  </div>
                </TabsTrigger>
                <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <div className="flex items-center gap-2 py-2">
                    <CalendarDays className="w-4 h-4" />
                    <span>الكل</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="bookings" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <div className="flex items-center gap-2 py-2">
                    <Users className="w-4 h-4" />
                    <span>الحجوزات</span>
                    {onlineBookingsData?.items?.length > 0 && (
                      <Badge className="h-5 px-1.5 bg-amber-100 text-amber-700 hover:bg-amber-100">
                        {onlineBookingsData.items.length}
                      </Badge>
                    )}
                  </div>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="upcoming" className="mt-4">
                {isUpcomingLoading ? (
                  <TableSkeleton />
                ) : (
                  <TableContainer>
                    <AppointmentsTable
                      appointments={upcomingData?.items || []}
                      total={upcomingData?.total || 0}
                      page={page}
                      pageSize={APPOINTMENTS_PAGE_SIZE}
                      onPageChange={setPage}
                      isLoading={isUpcomingLoading}
                    />
                  </TableContainer>
                )}
              </TabsContent>
              
              <TabsContent value="all" className="mt-4">
                {isAllLoading ? (
                  <TableSkeleton />
                ) : (
                  <TableContainer>
                    <AppointmentsTable
                      appointments={allData?.items || []}
                      total={allData?.total || 0}
                      page={allAppointmentsPage}
                      pageSize={APPOINTMENTS_PAGE_SIZE}
                      onPageChange={setAllAppointmentsPage}
                      isLoading={isAllLoading}
                    />
                  </TableContainer>
                )}
              </TabsContent>
              
              <TabsContent value="bookings" className="mt-4">
                {isOnlineBookingsLoading ? (
                  <TableSkeleton />
                ) : (
                  <TableContainer>
                    <OnlineBookingsTable
                      bookings={onlineBookingsData?.items || []}
                      total={onlineBookingsData?.total || 0}
                      page={1}
                      pageSize={100}
                      onPageChange={() => {}}
                      isLoading={isOnlineBookingsLoading}
                    />
                  </TableContainer>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Desktop Tabs */}
          <div className="hidden md:block">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
              <div className="flex">
                <button
                  className={`flex-1 py-4 px-6 text-center transition-all font-medium ${
                    activeTab === "upcoming"
                      ? "text-blue-600 border-b-2 border-blue-500 bg-blue-50/50"
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
                      ? "text-blue-600 border-b-2 border-blue-500 bg-blue-50/50"
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
                      ? "text-blue-600 border-b-2 border-blue-500 bg-blue-50/50"
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
                  <TableContainer>
                    <AppointmentsTable
                      appointments={upcomingData?.items || []}
                      total={upcomingData?.total || 0}
                      page={page}
                      pageSize={APPOINTMENTS_PAGE_SIZE}
                      onPageChange={setPage}
                      isLoading={isUpcomingLoading}
                    />
                  </TableContainer>
                )}
              </div>
            )}

            {activeTab === "all" && (
              <div>
                {isAllLoading ? (
                  <TableSkeleton />
                ) : (
                  <TableContainer>
                    <AppointmentsTable
                      appointments={allData?.items || []}
                      total={allData?.total || 0}
                      page={allAppointmentsPage}
                      pageSize={APPOINTMENTS_PAGE_SIZE}
                      onPageChange={setAllAppointmentsPage}
                      isLoading={isAllLoading}
                    />
                  </TableContainer>
                )}
              </div>
            )}

            {activeTab === "bookings" && (
              <div>
                {isOnlineBookingsLoading ? (
                  <TableSkeleton />
                ) : (
                  <TableContainer>
                    <OnlineBookingsTable
                      bookings={onlineBookingsData?.items || []}
                      total={onlineBookingsData?.total || 0}
                      page={1}
                      pageSize={100}
                      onPageChange={() => {}}
                      isLoading={isOnlineBookingsLoading}
                    />
                  </TableContainer>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Side Menu */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent side="right" className="w-[85vw] max-w-md">
            <SheetHeader>
              <SheetTitle className="text-right">القائمة</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12 rounded-xl"
                onClick={() => {
                  setIsMobileMenuOpen(false)
                  navigate("/work-mode")
                }}
              >
                <Calendar className="w-5 h-5" />
                وضع العمل
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12 rounded-xl"
                onClick={() => {
                  setIsMobileMenuOpen(false)
                  setShowFilters(!showFilters)
                }}
              >
                <Filter className="w-5 h-5" />
                {showFilters ? 'إخفاء الفلاتر' : 'الفلاتر'}
              </Button>
              <div className="pt-4 border-t">
                <div className="text-sm font-medium text-gray-500 mb-3">الإحصائيات</div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">مواعيد اليوم</span>
                    <Badge className="bg-blue-100 text-blue-700">{stats.today}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">القادمة</span>
                    <Badge className="bg-green-100 text-green-700">{stats.upcoming}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">المجموع</span>
                    <Badge className="bg-purple-100 text-purple-700">{stats.total}</Badge>
                  </div>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Floating Action Button for Mobile */}
        <Button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 md:hidden h-14 w-14 rounded-full shadow-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 z-50 animate-bounce shadow-lg"
          size="icon"
        >
          <Plus className="w-6 h-6" />
        </Button>

        {/* Appointment Create Dialog */}
        <AppointmentCreateDialog open={open} onClose={() => setOpen(false)} />
      </div>
    </div>
  )
}