import { Calendar, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Calendar as CalendarComponent } from "./calendar";
import { ar } from "date-fns/locale/ar-SA";
import { format } from "date-fns";

export default function AppointmentTimePicker({ 
  selectedDate, 
  onDateChange, 
  selectedTime, 
  onTimeChange, 
  clinicAvailableTime,
  className = "",
  mobileView = false 
}) {
  const [openCalendar, setOpenCalendar] = useState(false);
  const [openTimePicker, setOpenTimePicker] = useState(false);
  const [availableTimes, setAvailableTimes] = useState([]);

  useEffect(() => {
    if (selectedDate && clinicAvailableTime) {
      generateAvailableTimes();
    }
  }, [selectedDate, clinicAvailableTime]);

  const generateAvailableTimes = () => {
    if (!clinicAvailableTime) {
      setAvailableTimes([]);
      return;
    }

    const times = [];
    
    try {
      const [startStr, endStr] = clinicAvailableTime.split(' - ');
      
      // تحويل الأوقات إلى 24 ساعة
      const parseTime = (timeStr) => {
        const time = timeStr.trim();
        const isPM = time.includes('م') || time.includes('PM');
        const timePart = time.split(' ')[0];
        const [hours, minutes] = timePart.split(':').map(Number);
        
        let hour24 = hours;
        if (isPM && hours !== 12) hour24 = hours + 12;
        if (!isPM && hours === 12) hour24 = 0;
        
        return { hours: hour24, minutes: minutes || 0 };
      };

      const startTime = parseTime(startStr);
      const endTime = parseTime(endStr);

      // توليد الأوقات المتاحة كل 30 دقيقة
      const now = new Date();
      const today = new Date(selectedDate);
      today.setHours(0, 0, 0, 0);
      
      const isToday = today.getDate() === now.getDate() && 
                     today.getMonth() === now.getMonth() && 
                     today.getFullYear() === now.getFullYear();

      for (let hour = startTime.hours; hour <= endTime.hours; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          if (hour === endTime.hours && minute > endTime.minutes) break;
          
          const timeDate = new Date(selectedDate);
          timeDate.setHours(hour, minute, 0, 0);
          
          // تخطي الأوقات الماضية إذا كان اليوم هو اليوم الحالي
          if (isToday && timeDate <= now) continue;

          const period = hour >= 12 ? 'م' : 'ص';
          const displayHour = hour % 12 || 12;
          const timeStr = `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
          
          times.push(timeStr);
        }
      }
      
      setAvailableTimes(times);
    } catch (error) {
      console.error("خطأ في توليد الأوقات:", error);
      setAvailableTimes([]);
    }
  };

  const handleDateSelect = (date) => {
    onDateChange(date);
    setOpenCalendar(false);
    onTimeChange(null);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* اختيار التاريخ */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-900 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          التاريخ
        </Label>
        <Popover open={openCalendar} onOpenChange={setOpenCalendar}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-right h-11 border-gray-300"
            >
              {selectedDate ? (
                format(selectedDate, "EEEE، d MMMM yyyy", { locale: ar })
              ) : (
                <span className="text-gray-500">اختر تاريخ الموعد</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              initialFocus
              locale={ar}
              disabled={(date) => {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                yesterday.setHours(23, 59, 59, 999);
                return date <= yesterday;
              }}
              className="rounded-[var(--radius)] border"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* اختيار الوقت */}
      {selectedDate && (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-900 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            الوقت
          </Label>
          <div className="max-h-80 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="grid grid-cols-3 gap-2 pb-1">
              {availableTimes.length > 0 ? (
                availableTimes.map((time, index) => (
                  <Button
                    key={index}
                    type="button"
                    variant={selectedTime === time ? "default" : "outline"}
                    className={`h-11 ${selectedTime === time ? 'bg-primary' : 'border-gray-300'}`}
                    onClick={() => onTimeChange(time)}
                  >
                    {time}
                  </Button>
                ))
              ) : (
                <div className="col-span-3 text-center py-4 text-gray-500">
                  لا توجد أوقات متاحة لهذا التاريخ
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}