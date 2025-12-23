import { format, parse } from "date-fns";
import { ar } from "date-fns/locale";
import { useState } from "react";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { ScrollArea } from "./scroll-area";

export default function AppointmentTimePicker({ 
  selectedDate, 
  onDateChange, 
  selectedTime, 
  onTimeChange,
  availableTimeSlots = [],
  clinicAvailableTime = null
}) {
  const today = new Date();
  const [date, setDate] = useState(selectedDate || today);
  const [time, setTime] = useState(selectedTime || null);

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

  const handleDateSelect = (newDate) => {
    if (newDate && isDateAvailable(newDate)) {
      setDate(newDate);
      setTime(null);
      if (onDateChange) {
        onDateChange(newDate);
      }
      if (onTimeChange) {
        onTimeChange(null);
      }
    }
  };

  const handleTimeSelect = (selectedTime) => {
    setTime(selectedTime);
    if (onTimeChange) {
      onTimeChange(selectedTime);
    }
  };

  return (
    <div className="rounded-lg border border-border">
      <div className="flex max-sm:flex-col">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          className="p-2 sm:pe-5 bg-background w-full"
          disabled={[{ before: new Date() }, (date) => !isDateAvailable(date)]}
        />
        <div className="relative w-full max-sm:h-auto sm:w-40">
          <div className="border-border py-4 max-sm:border-t">
            <ScrollArea className="max-sm:h-auto sm:h-[300px] border-border sm:border-s [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="space-y-3">
                <div className="flex h-5 shrink-0 items-center px-5">
                  <p className="text-sm font-medium">
                    {format(date, "EEEE, d MMMM", { locale: ar })}
                  </p>
                </div>
                {timeSlots.length > 0 ? (
                  <div className="grid gap-1.5 px-5 max-sm:grid-cols-3 sm:grid-cols-1 pb-4">
                    {timeSlots.map(({ time: timeSlot, available }) => (
                      <Button
                        key={timeSlot}
                        variant={time === timeSlot ? "default" : "outline"}
                        size="sm"
                        className="w-full"
                        onClick={() => handleTimeSelect(timeSlot)}
                        disabled={!available}
                      >
                        {timeSlot}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="px-5 py-3 text-center text-sm text-muted-foreground">
                    لا توجد أوقات متاحة لهذا اليوم
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}
