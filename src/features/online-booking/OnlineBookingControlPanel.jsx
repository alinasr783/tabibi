import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Switch } from "../../components/ui/switch";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { 
  Copy, 
  ExternalLink, 
  QrCode, 
  Calendar, 
  Users,
  CheckCircle,
  XCircle,
  Link as LinkIcon,
  AlertTriangle,
  Globe,
  BarChart2,
  FileX,
  Ban
} from "lucide-react";
import useClinic from "../auth/useClinic";
import useUpdateClinic from "../clinic/useUpdateClinic";
import toast from "react-hot-toast";
import QRCode from "react-qr-code";
import { useOnlineBookings } from "./useOnlineBookings";
import OnlineBookingsTable from "./OnlineBookingsTable";
import useScrollToTop from "../../hooks/useScrollToTop";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import DraftsTable from "./components/DraftsTable";
import BlockedNumbersManager from "./components/BlockedNumbersManager";

export default function OnlineBookingControlPanel() {
  useScrollToTop();
  const { data: clinic, isLoading: isClinicLoading, isError, error } = useClinic();
  const { mutate: updateClinic, isPending: isUpdating } = useUpdateClinic();
  
  const [clinicFormData, setClinicFormData] = useState({
    booking_price: "",
    online_booking_enabled: true
  });
  
  const [showQRCode, setShowQRCode] = useState(false);
  
  const { bookings, loading: bookingsLoading, error: bookingsError } = useOnlineBookings(clinic?.clinic_uuid);
  
  useEffect(() => {
    if (!clinic) return;
    
    setClinicFormData({
      booking_price: clinic.booking_price || "",
      online_booking_enabled: clinic.online_booking_enabled !== undefined ? clinic.online_booking_enabled : true
    });
  }, [clinic]);
  
  const handleClinicChange = (e) => {
    const { name, value } = e.target;
    setClinicFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  
  const toggleOnlineBooking = () => {
    const newValue = !clinicFormData.online_booking_enabled;
    setClinicFormData((prev) => ({
      ...prev,
      online_booking_enabled: newValue,
    }));
    
    updateClinic({
      ...clinicFormData,
      online_booking_enabled: newValue
    });
  };
  
  const handleUpdateClinic = (e) => {
    e.preventDefault();
    updateClinic(clinicFormData);
  };
  
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("تم نسخ النص إلى الحافظة");
  };
  
  const getBookingLink = () => {
    if (!clinic) return "";
    const clinicId = clinic.clinic_uuid;
    if (!clinicId) return "";
    return `${window.location.origin}/booking/${clinicId}`;
  };
  
  const getEmbedCode = () => {
    const link = getBookingLink();
    if (!link) return "";
    return `<iframe src="${link}" width="100%" height="600" frameborder="0"></iframe>`;
  };
  
  const handleAcceptBooking = async (bookingId) => {
    try {
      const response = await fetch(`/api/appointments/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' }),
      });
      if (!response.ok) throw new Error('Failed to accept booking');
      toast.success("تم قبول الحجز بنجاح");
    } catch (error) {
      console.error("Error accepting booking:", error);
      toast.error("فشل في قبول الحجز");
    }
  };

  const handleRejectBooking = async (bookingId) => {
    try {
      const response = await fetch(`/api/appointments/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (!response.ok) throw new Error('Failed to reject booking');
      toast.success("تم رفض الحجز بنجاح");
    } catch (error) {
      console.error("Error rejecting booking:", error);
      toast.error("فشل في رفض الحجز");
    }
  };
  
  if (isClinicLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }
  
  if (isError || !clinic) {
    return (
      <div className="space-y-8" dir="rtl">
        <div className="space-y-3">
          <h1 className="text-2xl font-bold">إدارة الحجز الإلكتروني</h1>
          <p className="text-sm text-muted-foreground">
            إدارة إعدادات الحجز الإلكتروني وعرض الطلبات الواردة
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              خطأ في تحميل بيانات العيادة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-red-500">
                {isError ? `فشل تحميل بيانات العيادة: ${error?.message || 'خطأ غير معروف'}` : 
                 "لم نتمكن من تحميل بيانات العيادة. يرجى التأكد من أنك قمت بتسجيل الدخول وأن لديك عيادة مرتبطة بحسابك."}
              </p>
              <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
                تحديث الصفحة
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 p-3 md:p-6 bg-background min-h-screen pb-20 md:pb-6" dir="rtl">
      <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
        <div className="p-1.5 md:p-2 rounded-lg bg-primary/10 text-primary">
          <Globe className="w-5 h-5 md:w-6 md:h-6" />
        </div>
        <div style={{direction: 'rtl'}}>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">الحجز ع النت</h1>
          <p className="text-xs md:text-sm text-muted-foreground">تحكم في إعدادات الحجز من النت</p>
        </div>
      </div>
      
      <Tabs defaultValue="settings" className="w-full" style={{direction: 'rtl'}}>
        <TabsList className="w-full grid grid-cols-2 h-auto p-1 bg-muted/50 mb-6" style={{direction: 'rtl'}}>
                    <TabsTrigger value="settings" className="text-sm py-2 gap-2">
                        <span className="truncate">الإعدادات</span>
                    </TabsTrigger>
                    <TabsTrigger value="bookings" className="text-sm py-2 gap-2 relative">
                        <span className="truncate">الحجوزات</span>
                        {bookings?.filter(b => b.status === 'pending').length > 0 && (
                            <Badge variant="destructive" className="absolute -top-1 -left-1 px-1 h-4 min-w-[16px] flex items-center justify-center text-[10px] rounded-full">
                                {bookings.filter(b => b.status === 'pending').length}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

        <TabsContent value="settings" className="space-y-6">
            {/* Online Booking Status Card */}
            <Card className="bg-card/70" style={{direction: 'rtl'}}>
                <CardHeader className="p-3 md:p-6">
                <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base md:text-lg m-0">
                    حالة الحجز من النت
                    </CardTitle>
                    <div className="flex items-center gap-2 flex-shrink-0">
                    <Switch
                        checked={clinicFormData.online_booking_enabled}
                        onCheckedChange={toggleOnlineBooking}
                    />
                    <Badge 
                        variant={clinicFormData.online_booking_enabled ? "default" : "secondary"}
                        className="gap-1 text-xs whitespace-nowrap"
                    >
                        {clinicFormData.online_booking_enabled ? (
                        <>
                            <CheckCircle className="h-3 w-3 md:h-4 md:w-4" />
                            مفعل
                        </>
                        ) : (
                        <>
                            <XCircle className="h-3 w-3 md:h-4 md:w-4" />
                            متقفل
                        </>
                        )}
                    </Badge>
                    </div>
                </div>
                </CardHeader>
                <CardContent className="p-3 md:p-6 pt-0">
                <p className="text-xs md:text-sm text-muted-foreground">
                    {clinicFormData.online_booking_enabled
                    ? "الحجز من النت شغال دلوقتي"
                    : "الحجز من النت متقفل دلوقتي"}
                </p>
                </CardContent>
            </Card>
            
            {/* Booking Link Card */}
            <Card className="bg-card/70">
                <CardHeader className="p-3 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <LinkIcon className="h-4 w-4 md:h-5 md:w-5" />
                    رابط الحجز
                </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4 p-3 md:p-6 pt-0">
                <div className="flex flex-col gap-2">
                    <Input
                    value={getBookingLink() || "جارٍ تحميل الرابط..."}
                    readOnly
                    dir="ltr"
                    className="flex-1 text-xs md:text-sm w-full text-left"
                    />
                    <div className="flex gap-2 w-full">
                    <Button
                        onClick={() => copyToClipboard(getBookingLink())}
                        className="gap-1 md:gap-2 flex-1"
                        size="sm"
                        disabled={!getBookingLink()}
                    >
                        <Copy className="h-3 w-3 md:h-4 md:w-4" />
                        <span className="text-xs md:text-sm">نسخ</span>
                    </Button>
                    <Button
                        onClick={() => window.open(getBookingLink(), "_blank")}
                        variant="outline"
                        className="gap-1 md:gap-2 flex-1"
                        size="sm"
                        disabled={!getBookingLink()}
                    >
                        <ExternalLink className="h-3 w-3 md:h-4 md:w-4" />
                        <span className="text-xs md:text-sm">فتح</span>
                    </Button>
                    </div>
                </div>
                
                <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                    <Button
                    onClick={() => setShowQRCode(!showQRCode)}
                    variant="outline"
                    size="sm"
                    className="gap-1 md:gap-2 w-full sm:w-auto text-xs md:text-sm"
                    disabled={!getBookingLink()}
                    >
                    <QrCode className="h-3 w-3 md:h-4 md:w-4" />
                    {showQRCode ? "إخفاء" : "عرض"} رمز QR
                    </Button>
                    
                    <Button
                    onClick={() => copyToClipboard(getEmbedCode())}
                    variant="outline"
                    size="sm"
                    className="gap-1 md:gap-2 w-full sm:w-auto text-xs md:text-sm"
                    disabled={!getBookingLink()}
                    >
                    <Copy className="h-3 w-3 md:h-4 md:w-4" />
                    نسخ كود التضمين
                    </Button>
                </div>
                
                {showQRCode && getBookingLink() && (
                    <div className="mt-3 md:mt-4 p-3 md:p-4 bg-white rounded-lg inline-block">
                    <QRCode value={getBookingLink()} size={120} className="w-full max-w-[120px] h-auto" />
                    </div>
                )}
                
                <p className="text-[10px] md:text-xs text-muted-foreground">
                    شارك هذا الرابط مع مرضاك لحجز المواعيد، أو استخدم رمز QR في العيادة
                </p>
                </CardContent>
            </Card>
            
            {/* Booking Price Card */}
            <Card>
                <CardHeader className="p-3 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <Calendar className="h-4 w-4 md:h-5 md:w-5" />
                    سعر الحجز الإلكتروني
                </CardTitle>
                </CardHeader>
                <CardContent className="p-3 md:p-6 pt-0">
                <form onSubmit={handleUpdateClinic} className="space-y-3 md:space-y-4">
                    <div className="space-y-2">
                    <Label htmlFor="bookingPrice" className="text-xs md:text-sm">سعر الحجز</Label>
                    <Input
                        id="bookingPrice"
                        name="booking_price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={clinicFormData.booking_price}
                        onChange={handleClinicChange}
                        placeholder="أدخل سعر الحجز"
                        className="text-sm"
                    />
                    <p className="text-[10px] md:text-xs text-muted-foreground">
                        سعر الحجز الذي سيظهر لمرضى العيادة عند الحجز الإلكتروني
                    </p>
                    </div>
                    
                    <Button type="submit" disabled={isUpdating} size="sm" className="w-full sm:w-auto">
                    {isUpdating ? "جاري الحفظ..." : "حفظ السعر"}
                    </Button>
                </form>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="bookings">
            <Card>
                <CardHeader className="p-3 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <Users className="h-4 w-4 md:h-5 md:w-5" />
                    طلبات الحجز القادمة
                </CardTitle>
                </CardHeader>
                <CardContent className="p-0 md:p-6 md:pt-0">
                {bookingsLoading ? (
                    <div className="space-y-3 p-3 md:p-0">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
                    ))}
                    </div>
                ) : bookingsError ? (
                    <div className="text-center py-8 text-red-500 px-3">
                    <AlertTriangle className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-4" />
                    <h3 className="text-base md:text-lg font-medium mb-2">خطأ في تحميل الحجوزات</h3>
                    <p className="text-xs md:text-sm">{bookingsError}</p>
                    </div>
                ) : (
                    <OnlineBookingsTable
                    appointments={bookings}
                    onAccept={handleAcceptBooking}
                    onReject={handleRejectBooking}
                    />
                )}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
