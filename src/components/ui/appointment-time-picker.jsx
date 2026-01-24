import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { ScrollArea, ScrollBar } from "./scroll-area";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";

export default function AppointmentTimePicker({ 
  selectedDate, 
  onDateChange, 
  selectedTime, 
  onTimeChange,
  availableTimeSlots = [],
  clinicAvailableTime = null,
  autoSelectFirstAvailable = false
}) {
  const today = new Date();
  const [date, setDate] = useState(selectedDate || today);
  const [time, setTime] = useState(selectedTime || null);
  const [selectedHourKey, setSelectedHourKey] = useState(null);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  // Function to check if a date is available based on clinic hours
  const isDateAvailableCheck = (dateToCheck) => {
    // Disable past dates (but allow today)
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const checkDate = new Date(dateToCheck);
    checkDate.setHours(0, 0, 0, 0);
    
    if (checkDate < todayDate) {
      return false;
    }
    
    // If no clinic hours provided, enable all future dates including today
    if (!clinicAvailableTime) return true;
    
    const dayOfWeek = dateToCheck.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const dayConfig = clinicAvailableTime[dayOfWeek];
    
    // If day is off or missing configuration, disable the date
    if (!dayConfig || dayConfig.off) return false;
    
    return true;
  };

  // Find first available date
  const findFirstAvailableDate = () => {
    if (!autoSelectFirstAvailable || !clinicAvailableTime) return today;
    
    const maxDaysToCheck = 30; // Check up to 30 days ahead
    const startDate = new Date();
    
    for (let i = 0; i < maxDaysToCheck; i++) {
      const checkDate = new Date(startDate);
      checkDate.setDate(startDate.getDate() + i);
      
      if (isDateAvailableCheck(checkDate)) {
        return checkDate;
      }
    }
    
    return today; // Fallback to today if no available date found
  };

  // Auto-select first available date on mount if enabled
  useEffect(() => {
    if (autoSelectFirstAvailable && !selectedDate && !hasAutoSelected) {
      const firstAvailable = findFirstAvailableDate();
      setDate(firstAvailable);
      setHasAutoSelected(true);
      if (onDateChange) {
        onDateChange(firstAvailable);
      }
    }
  }, [autoSelectFirstAvailable, selectedDate, hasAutoSelected, clinicAvailableTime]);

  // Default time slots if none provided (12-hour format)
  const defaultTimeSlots = [
    { time: "09:00 AM", available: true },
    { time: "09:30 AM", available: true },
    { time: "10:00 AM", available: true },
    { time: "10:30 AM", available: true },
    { time: "11:00 AM", available: true },
    { time: "11:30 AM", available: true },
    { time: "12:00 PM", available: false },
    { time: "12:30 PM", available: true },
    { time: "01:00 PM", available: true },
    { time: "01:30 PM", available: true },
    { time: "02:00 PM", available: true },
    { time: "02:30 PM", available: true },
    { time: "03:00 PM", available: true },
    { time: "03:30 PM", available: true },
    { time: "04:00 PM", available: true },
    { time: "04:30 PM", available: true },
    { time: "05:00 PM", available: true },
    { time: "05:30 PM", available: true },
  ];

  // Generate time slots based on clinic working hours (12-hour format)
  const generateTimeSlots = (date, clinicHours) => {
    if (!date || !clinicHours) return defaultTimeSlots;
    
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const dayConfig = clinicHours[dayOfWeek];
    
    // If day is off or missing configuration, return empty array to indicate no slots
    if (!dayConfig || dayConfig.off) return [];
    
    // If start or end times are not set, return default slots
    if (!dayConfig.start || !dayConfig.end) return defaultTimeSlots;
    
    const startTime = dayConfig.start;
    const endTime = dayConfig.end;
    
    // Validate time format
    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(startTime) || 
        !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(endTime)) {
      return defaultTimeSlots;
    }
    
    // Parse start and end times
    const [startHour, startMinute] = startTime.split(':').map(str => parseInt(str, 10));
    const [endHour, endMinute] = endTime.split(':').map(str => parseInt(str, 10));
    
    // Validate time values
    if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute) ||
        startHour > 23 || startMinute > 59 || endHour > 23 || endMinute > 59) {
      return defaultTimeSlots;
    }
    
    // Ensure end time is after start time
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    
    if (endTotalMinutes <= startTotalMinutes) {
      return defaultTimeSlots;
    }
    
    const slots = [];
    let currentHour = startHour;
    let currentMinute = startMinute;
    
    // Generate 30-minute slots in 12-hour format
    while ((currentHour < endHour) || (currentHour === endHour && currentMinute < endMinute)) {
      // Convert to 12-hour format
      let displayHour = currentHour;
      let period = 'AM';
      
      if (currentHour >= 12) {
        period = 'PM';
        if (currentHour > 12) {
          displayHour = currentHour - 12;
        }
      } else if (currentHour === 0) {
        displayHour = 12;
      }
      
      const timeString = `${displayHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')} ${period}`;
      slots.push({ time: timeString, available: true });
      
      // Increment by 30 minutes
      currentMinute += 30;
      if (currentMinute >= 60) {
        currentMinute -= 60;
        currentHour++;
      }
      
      // Break if we've exceeded the end time
      const currentTotalMinutes = currentHour * 60 + currentMinute;
      if (currentTotalMinutes >= endTotalMinutes) {
        break;
      }
    }
    
    // If no slots were generated, return default slots
    if (slots.length === 0) {
      return defaultTimeSlots;
    }
    
    return slots;
  };

  // Function to check if a date is available based on clinic hours
  const isDateAvailable = (date) => {
    // Disable past dates (but allow today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      return false;
    }
    
    // If no clinic hours provided, enable all future dates including today
    if (!clinicAvailableTime) return true;
    
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const dayConfig = clinicAvailableTime[dayOfWeek];
    
    // If day is off or missing configuration, disable the date
    if (!dayConfig || dayConfig.off) return false;
    
    return true;
  };

  // Generate time slots based on clinic working hours
  const timeSlots = clinicAvailableTime 
    ? generateTimeSlots(date, clinicAvailableTime)
    : (availableTimeSlots.length > 0 ? availableTimeSlots : defaultTimeSlots);

  // Group slots by hour
  const groupedSlots = useMemo(() => {
    const groups = {};
    timeSlots.forEach(slot => {
      // slot.time is "09:00 AM"
      // Split safely
      const parts = slot.time.split(' ');
      if (parts.length < 2) return;
      
      const [timePart, period] = parts;
      const [hour, minute] = timePart.split(':');
      
      // Key: "09 AM"
      const hourKey = `${hour} ${period}`;
      
      if (!groups[hourKey]) {
        groups[hourKey] = {
          id: hourKey,
          hour,
          period,
          display: `${hour} ${period === 'AM' ? 'ص' : 'م'}`,
          minutes: []
        };
      }
      
      groups[hourKey].minutes.push({
        minute,
        fullTime: slot.time,
        available: slot.available
      });
    });
    
    return Object.values(groups);
  }, [timeSlots]);

  // Reset selection when date changes
  const handleDateSelect = (newDate) => {
    if (newDate && isDateAvailable(newDate)) {
      setDate(newDate);
      setTime(null);
      setSelectedHourKey(null);
      if (onDateChange) {
        onDateChange(newDate);
      }
      if (onTimeChange) {
        onTimeChange(null);
      }
    }
  };

  const handleHourSelect = (hourKey) => {
    setSelectedHourKey(hourKey);
    // When changing hour, we could clear the time, or auto-select first available minute?
    // Let's clear time to force user to pick a minute
    setTime(null);
    if (onTimeChange) {
      onTimeChange(null);
    }
  };

  const handleTimeSelect = (selectedTime) => {
    setTime(selectedTime);
    if (onTimeChange) {
      onTimeChange(selectedTime);
    }
  };

  // Initialize selectedHourKey if a time is already selected
  useEffect(() => {
    if (selectedTime) {
      const parts = selectedTime.split(' ');
      if (parts.length >= 2) {
        const [timePart, period] = parts;
        const [hour] = timePart.split(':');
        const key = `${hour} ${period}`;
        setSelectedHourKey(key);
      }
    }
  }, [selectedTime]);

  return (
    <div className="rounded-[var(--radius)] border border-border bg-background overflow-hidden w-full">
      {/* Calendar Section */}
      <div className="p-2 sm:p-3 w-full">
        <div className="w-full overflow-x-auto">
          <Calendar
            mode="single"
            locale={ar}
            selected={date}
            onSelect={handleDateSelect}
            className="w-full min-w-[280px]"
            disabled={[{ before: new Date() }, (date) => !isDateAvailable(date)]}
          />
        </div>
      </div>
      
      {/* Modern Time Picker Section */}
      <div className="border-t border-border bg-muted/20">
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-foreground truncate">
              {format(date, "EEEE, d MMMM", { locale: ar })}
            </p>
          </div>
          
          {timeSlots.length > 0 ? (
            <div className="flex gap-4 h-[300px] w-full" dir="rtl">
              {/* Hours Selection */}
              <div className="flex-1 flex flex-col min-w-0">
                <p className="text-xs text-muted-foreground mb-2 font-medium text-center">الساعة</p>
                <ScrollArea className="flex-1 rounded-[var(--radius)] border bg-background w-full">
                  <div className="flex flex-col gap-2 p-2">
                    {groupedSlots.map((group) => (
                      <button
                        key={group.id}
                        onClick={() => handleHourSelect(group.id)}
                        className={`
                          flex items-center justify-between px-4 py-3 rounded-lg border transition-all duration-200 w-full text-right
                          ${selectedHourKey === group.id 
                            ? "bg-primary text-primary-foreground border-primary shadow-sm font-bold" 
                            : "bg-background hover:bg-muted text-foreground border-transparent hover:border-border"
                          }
                        `}
                      >
                        <span className="text-lg leading-none">{group.hour}</span>
                        <span className="text-xs opacity-80">{group.period === 'AM' ? 'صباحاً' : 'مساءً'}</span>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Minutes Selection */}
              <div className="flex-1 flex flex-col min-w-0">
                <p className="text-xs text-muted-foreground mb-2 font-medium text-center">الدقيقة</p>
                <div className="flex-1 relative rounded-[var(--radius)] border bg-background overflow-hidden">
                  {selectedHourKey ? (
                    <ScrollArea className="h-full w-full">
                      <div className="flex flex-col gap-2 p-2">
                        {groupedSlots
                          .find(g => g.id === selectedHourKey)
                          ?.minutes.map(({ minute, fullTime, available }) => (
                            <button
                              key={fullTime}
                              onClick={() => handleTimeSelect(fullTime)}
                              disabled={!available}
                              className={`
                                flex items-center justify-center py-3 rounded-md border transition-all duration-200 w-full
                                ${time === fullTime
                                  ? "bg-primary text-primary-foreground border-primary shadow-sm font-bold" 
                                  : "bg-background hover:bg-muted text-foreground border-transparent hover:border-border"
                                }
                                ${!available ? "opacity-50 cursor-not-allowed bg-muted" : ""}
                              `}
                            >
                              <span className="text-base">{minute}</span>
                            </button>
                          ))
                        }
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/10 p-4 text-center">
                      <Clock className="w-8 h-8 text-muted-foreground/20 mb-2" />
                      <p className="text-xs text-muted-foreground">اختر الساعة لعرض الدقائق</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center bg-background rounded-[var(--radius)] border border-dashed">
              <p className="text-sm text-muted-foreground">لا توجد أوقات متاحة لهذا اليوم</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
