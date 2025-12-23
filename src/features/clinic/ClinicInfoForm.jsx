import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Skeleton } from "../../components/ui/skeleton"
import WorkingHours from "./WorkingHours"
import { Copy, Building, MapPin, CreditCard, Link, Hash, Clock, AlertCircle, Save, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { getDayName } from "./clinicUtils"

export default function ClinicInfoForm({
  clinicFormData,
  isClinicLoading,
  isClinicError,
  isUpdating,
  onClinicChange,
  onTimeChange,
  onDayToggle,
  onSubmit,
  clinicId,
}) {
  if (isClinicLoading) {
    return (
      <div className="p-3 sm:p-4 space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
        <div className="space-y-2 sm:space-y-3">
          <Skeleton className="h-6 sm:h-7 w-28 sm:w-32" />
          <Skeleton className="h-9 sm:h-10 w-full" />
        </div>
        <div className="space-y-2 sm:space-y-3">
          <Skeleton className="h-6 sm:h-7 w-28 sm:w-32" />
          <Skeleton className="h-9 sm:h-10 w-full" />
        </div>
        <Skeleton className="h-24 sm:h-28 w-full" />
      </div>
    )
  }

  if (isClinicError) {
    return (
      <div className="p-3 sm:p-4 md:p-6 text-center w-full max-w-full overflow-hidden">
        <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-3 sm:mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 sm:w-7 sm:h-7 text-red-600" />
        </div>
        <h3 className="text-sm sm:text-base font-medium text-foreground mb-1 sm:mb-2">مشكلة في التحميل</h3>
        <p className="text-xs sm:text-sm text-muted-foreground px-2">تعذر تحميل معلومات العيادة. حاول مرة أخرى</p>
      </div>
    )
  }

  const copyBookingLink = () => {
    const link = `${window.location.origin}/booking/${clinicId}`
    navigator.clipboard.writeText(link)
    toast.success("تم نسخ رابط الحجز")
  }

  return (
    <form onSubmit={onSubmit} className="p-2 sm:p-3 md:p-4 w-full max-w-full overflow-x-hidden">
      <div className="space-y-3 sm:space-y-4 md:space-y-6 w-full" style={{ direction: 'rtl' }}>
        {/* اسم العيادة */}
        <div className="space-y-1.5 sm:space-y-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
            <Label htmlFor="clinicName" className="text-foreground font-medium text-xs sm:text-sm md:text-base truncate">
              اسم العيادة
            </Label>
          </div>
          <Input
            id="clinicName"
            name="name"
            value={clinicFormData.name}
            onChange={onClinicChange}
            placeholder="اسم عيادتك"
            className="h-9 sm:h-10 md:h-11 w-full text-xs sm:text-sm md:text-base min-h-[40px] sm:min-h-[44px] px-2.5 sm:px-3"
          />
        </div>

        {/* العنوان */}
        <div className="space-y-1.5 sm:space-y-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
            <Label htmlFor="clinicAddress" className="text-foreground font-medium text-xs sm:text-sm md:text-base truncate">
              العنوان
            </Label>
          </div>
          <Input
            id="clinicAddress"
            name="address"
            value={clinicFormData.address}
            onChange={onClinicChange}
            placeholder="عنوان العيادة بالتفصيل"
            className="h-9 sm:h-10 md:h-11 w-full text-xs sm:text-sm md:text-base min-h-[40px] sm:min-h-[44px] px-2.5 sm:px-3"
          />
        </div>

        {/* سعر الحجز */}
        <div className="space-y-1.5 sm:space-y-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
            <Label htmlFor="bookingPrice" className="text-foreground font-medium text-xs sm:text-sm md:text-base truncate">
              سعر الحجز
            </Label>
          </div>
          <Input
            id="bookingPrice"
            name="booking_price"
            type="number"
            step="0.01"
            min="0"
            value={clinicFormData.booking_price}
            onChange={onClinicChange}
            placeholder="0.00"
            className="h-9 sm:h-10 md:h-11 w-full text-xs sm:text-sm md:text-base min-h-[40px] sm:min-h-[44px] px-2.5 sm:px-3"
          />
          <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground px-0.5">
            السعر اللي هيظهر للمريض وقت الحجز
          </p>
        </div>

        {/* أوقات العمل */}
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
            <Label className="text-foreground font-medium text-xs sm:text-sm md:text-base truncate">
              أوقات العمل
            </Label>
          </div>
          <WorkingHours
            availableTime={clinicFormData.available_time}
            onTimeChange={onTimeChange}
            onDayToggle={onDayToggle}
            getDayName={getDayName}
          />
        </div>

        {/* رابط الحجز */}
        <div className="space-y-1.5 sm:space-y-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
            <Label className="text-foreground font-medium text-xs sm:text-sm md:text-base truncate">
              رابط الحجز
            </Label>
          </div>
          <div className="flex flex-col xs:flex-row gap-1.5 sm:gap-2 w-full">
            <div className="flex-1 min-w-0 bg-muted/50 border border-border rounded-lg px-2.5 sm:px-3 py-2 text-[10px] sm:text-xs md:text-sm overflow-hidden">
              <span className="block truncate break-all">
                {`${window.location.origin}/booking/${clinicId}`}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={copyBookingLink}
              className="h-9 sm:h-10 md:h-11 px-3 sm:px-4 w-full xs:w-auto flex-shrink-0 min-h-[40px] sm:min-h-[44px] text-xs sm:text-sm"
            >
              <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="mr-1 sm:mr-2">نسخ</span>
            </Button>
          </div>
          <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground px-0.5">
            شارك الرابط مع مرضاك عشان يحجزوا أونلاين
          </p>
        </div>

        {/* رقم العيادة */}
        <div className="space-y-1.5 sm:space-y-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Hash className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
            <Label className="text-foreground font-medium text-xs sm:text-sm md:text-base truncate">
              رقم العيادة
            </Label>
          </div>
          <Input 
            value={clinicId || ""} 
            disabled 
            className="h-9 sm:h-10 md:h-11 w-full bg-muted/50 text-muted-foreground text-xs sm:text-sm md:text-base min-h-[40px] sm:min-h-[44px] px-2.5 sm:px-3"
          />
          <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground px-0.5">
            دا الرقم التعريفي بتاع عيادتك
          </p>
        </div>

        {/* زر الحفظ */}
        <div className="pt-2 sm:pt-3 md:pt-4">
          <Button 
            type="submit" 
            disabled={isUpdating}
            className="h-9 sm:h-10 md:h-11 w-full bg-primary hover:bg-primary/90 text-primary-foreground px-3 sm:px-6 md:px-8 rounded-lg text-xs sm:text-sm md:text-base min-h-[40px] sm:min-h-[44px] gap-1.5 sm:gap-2"
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Save className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                <span>حفظ التغييرات</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  )
}