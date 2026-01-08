import { useState, useEffect } from "react"
import { Input } from "./input"
import { Label } from "./label"

export default function SimpleDatePicker({ onDateChange, initialDate, error, availableTime, selectedDay }) {
  // Initialize state with initialDate or current date
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date().toISOString().split('T')[0])
  
  // Convert initial hour from 24-hour to 12-hour format
  const initialHour24 = initialDate ? new Date(initialDate).getHours() : 9
  const initialHour12 = initialHour24 === 0 ? 12 : (initialHour24 > 12 ? initialHour24 - 12 : initialHour24)
  
  const [selectedHour, setSelectedHour] = useState(initialHour12)
  const [selectedMinute, setSelectedMinute] = useState(initialDate ? new Date(initialDate).getMinutes().toString().padStart(2, '0') : '00')
  const [timePeriod, setTimePeriod] = useState(initialDate ? (initialHour24 < 12 ? 'morning' : 'evening') : 'morning')
  const [workingHoursInfo, setWorkingHoursInfo] = useState(null)
  const [isHoliday, setIsHoliday] = useState(false)

  // Generate hours (1-12 for 12-hour format)
  const hours = Array.from({ length: 12 }, (_, i) => i + 1)
  
  // Generate minutes (00, 15, 30, 45) - 15-minute intervals
  const minutes = ['00', '15', '30', '45']
  
  // Get day key for available_time object
  const getDayKey = (date) => {
    const dayIndex = date.getDay()
    // JavaScript's getDay() returns: 0: Sunday, 1: Monday, ..., 6: Saturday
    const dayMap = {
      0: "sunday",
      1: "monday",
      2: "tuesday",
      3: "wednesday",
      4: "thursday",
      5: "friday",
      6: "saturday"
    }
    return dayMap[dayIndex] || ""
  }

  // Convert 24-hour time format to 12-hour format with AM/PM
  const convertTo12HourFormat = (time24) => {
    if (!time24) return "";
    
    const [hours, minutes] = time24.split(":");
    let hour = parseInt(hours);
    const minute = minutes;
    
    const period = hour >= 12 ? "مساءً" : "صباحًا";
    hour = hour % 12 || 12;
    
    return `${hour}:${minute} ${period}`;
  }

  // Check if the selected time is within working hours
  const isTimeWithinWorkingHours = (availTime, selDate) => {
    if (isHoliday || !availTime || !selDate) return false;
    
    // Convert selected time to 24-hour format for comparison
    let selectedHour24 = selectedHour;
    if (timePeriod === 'evening' && selectedHour !== 12) {
      selectedHour24 = selectedHour + 12;
    } else if (timePeriod === 'morning' && selectedHour === 12) {
      selectedHour24 = 0;
    }
    
    const selectedTime = `${selectedHour24.toString().padStart(2, '0')}:${selectedMinute}`;
    
    // Get the original working hours data
    const date = new Date(selDate);
    const dayKey = getDayKey(date);
    const dayData = availTime[dayKey];
    
    if (!dayData || !dayData.start || !dayData.end) return false;
    
    return selectedTime >= dayData.start && selectedTime <= dayData.end;
  };

  // Check if the selected date is a holiday and get working hours
  useEffect(() => {
    if (availableTime && selectedDate) {
      const date = new Date(selectedDate)
      const dayKey = getDayKey(date)
      const dayData = availableTime[dayKey]
      
      if (dayData && dayData.off) {
        setIsHoliday(true)
        setWorkingHoursInfo(null)
      } else if (dayData && dayData.start && dayData.end) {
        setIsHoliday(false)
        setWorkingHoursInfo({
          start: convertTo12HourFormat(dayData.start),
          end: convertTo12HourFormat(dayData.end)
        })
      } else {
        setIsHoliday(false)
        setWorkingHoursInfo(null)
      }
    }
  }, [selectedDate, availableTime])

  // Handle date change
  const handleDateChange = (e) => {
    const newDate = e.target.value
    setSelectedDate(newDate)
    // Combine date and time and notify parent
    const combinedDateTime = combineDateTime(newDate, selectedHour, selectedMinute, timePeriod)
    onDateChange(combinedDateTime, newDate)
  }

  // Handle hour change
  const handleHourChange = (value) => {
    const newHour = parseInt(value)
    setSelectedHour(newHour)
    // Combine date and time and notify parent
    const combinedDateTime = combineDateTime(selectedDate, newHour, selectedMinute, timePeriod)
    onDateChange(combinedDateTime, selectedDate)
  }

  // Handle minute change
  const handleMinuteChange = (newMinute) => {
    setSelectedMinute(newMinute)
    // Combine date and time and notify parent
    const combinedDateTime = combineDateTime(selectedDate, selectedHour, newMinute, timePeriod)
    onDateChange(combinedDateTime, selectedDate)
  }

  // Handle time period change (morning/evening)
  const handleTimePeriodChange = (period) => {
    setTimePeriod(period)
    
    // Combine date and time and notify parent
    const combinedDateTime = combineDateTime(selectedDate, selectedHour, selectedMinute, period)
    onDateChange(combinedDateTime, selectedDate)
  }

  // Combine date and time into ISO string (convert 12-hour to 24-hour for storage)
  const combineDateTime = (date, hour, minute, period) => {
    // Convert 12-hour format to 24-hour format
    let hour24 = hour
    
    if (period === 'morning') {
      // 12 AM is 00:00 in 24-hour format
      if (hour === 12) {
        hour24 = 0
      }
    } else {
      // PM hours (except 12 PM which stays 12)
      if (hour !== 12) {
        hour24 = hour + 12
      }
    }
    
    // Format hour to two digits
    const formattedHour = hour24.toString().padStart(2, '0')
    const formattedMinute = minute.toString().padStart(2, '0')
    
    return `${date}T${formattedHour}:${formattedMinute}:00`
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="simple-date">التاريخ *</Label>
        <Input
          id="simple-date"
          type="date"
          value={selectedDate}
          onChange={handleDateChange}
          min={new Date().toISOString().split('T')[0]} // Don't allow past dates
        />
      </div>
      
      {/* Working Hours Information */}
      {isHoliday ? (
        <div className="p-3 bg-red-100 text-red-800 rounded-[var(--radius)] text-sm">
          ⚠️ هذا اليوم إجازة، لا يمكن الحجز في هذا اليوم
        </div>
      ) : workingHoursInfo ? (
        <div className="p-3 bg-blue-100 text-blue-800 rounded-[var(--radius)] text-sm">
          🕒 أوقات العمل لهذا اليوم: من {workingHoursInfo.start} إلى {workingHoursInfo.end}
        </div>
      ) : null}
      
      {!isHoliday && (
        <>
          <div className="space-y-2">
            <Label>الفترة الزمنية *</Label>
            <div className="flex gap-2">
              <button
                type="button"
                className={`flex-1 py-2 px-4 rounded-[var(--radius)] border transition-colors ${
                  timePeriod === 'morning' 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'bg-muted border-border hover:bg-muted/80'
                }`}
                onClick={() => handleTimePeriodChange('morning')}
                disabled={isHoliday}
              >
                صباحاً
              </button>
              <button
                type="button"
                className={`flex-1 py-2 px-4 rounded-[var(--radius)] border transition-colors ${
                  timePeriod === 'evening' 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'bg-muted border-border hover:bg-muted/80'
                }`}
                onClick={() => handleTimePeriodChange('evening')}
                disabled={isHoliday}
              >
                مساءً
              </button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>الوقت *</Label>
            <div className="flex gap-2 items-center">
              <div className="flex-1">
                <Select
                  value={selectedHour.toString()}
                  onValueChange={handleHourChange}
                  disabled={isHoliday}
                  dir="rtl"
                >
                  <SelectTrigger 
                    className={`h-10 w-full justify-between ${
                      isTimeWithinWorkingHours(availableTime, selectedDate) 
                        ? 'border-border' 
                        : 'border-red-500'
                    }`}
                  >
                    <SelectValue placeholder="الساعة" />
                  </SelectTrigger>
                  <SelectContent>
                    {hours.map(hour => (
                      <SelectItem key={hour} value={hour.toString()}>{hour}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <span className="text-muted-foreground">:</span>
              <div className="flex-1">
                <Select
                  value={selectedMinute}
                  onValueChange={handleMinuteChange}
                  disabled={isHoliday}
                  dir="rtl"
                >
                  <SelectTrigger 
                    className={`h-10 w-full justify-between ${
                      isTimeWithinWorkingHours(availableTime, selectedDate) 
                        ? 'border-border' 
                        : 'border-red-500'
                    }`}
                  >
                    <SelectValue placeholder="الدقيقة" />
                  </SelectTrigger>
                  <SelectContent>
                    {minutes.map(minute => (
                      <SelectItem key={minute} value={minute}>{minute}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {!isTimeWithinWorkingHours(availableTime, selectedDate) && !isHoliday && (
              <p className="text-sm text-red-500">الوقت المحدد خارج أوقات العمل</p>
            )}
            <p className="text-xs text-muted-foreground">
              اختر الساعة والدقيقة من القوائم
            </p>
          </div>
        </>
      )}
      
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}
