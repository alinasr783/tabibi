import {Label} from "../../components/ui/label";
import {Input} from "../../components/ui/input";
import {Textarea} from "../../components/ui/textarea";
import {Button} from "../../components/ui/button";
import AppointmentTimePicker from "../../components/ui/appointment-time-picker";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

export default function AppointmentFormCard({
  register,
  errors,
  watch,
  setValue,
  onSubmit,
  isLoading,
  clinic,
  selectedPatient,
  onChangePatient,
  validateWorkingHours,
  isAppointmentFormValid,
  selectedDate,
  setSelectedDate,
  selectedTime,
  setSelectedTime,
}) {
  const appointmentDate = watch("date");

  // Function to convert 12-hour time format to 24-hour format
  const convertTo24Hour = (time12h) => {
    if (!time12h) return null;
    
    // Handle both Arabic and English AM/PM
    const normalizedTime = time12h.replace(/صباحًا|AM/i, 'AM').replace(/مساءً|PM/i, 'PM');
    
    const [time, modifier] = normalizedTime.split(' ');
    if (!time || !modifier) return null;
    
    let [hours, minutes] = time.split(':');
    if (!hours || !minutes) return null;
    
    hours = parseInt(hours, 10);
    minutes = parseInt(minutes, 10);
    
    // Validate hours and minutes
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 12 || minutes < 0 || minutes > 59) {
      return null;
    }
    
    if (modifier === 'PM' && hours !== 12) {
      hours += 12;
    }
    
    if (modifier === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return { hours, minutes };
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg sm:text-xl">بيانات الحجز</CardTitle>
            <CardDescription className="text-sm">
              املأ البيانات التالية لحجز موعدك
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={onChangePatient}
            className="text-sm">
            تغيير المريض
          </Button>
        </div>
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="font-medium text-sm">{selectedPatient?.name}</p>
          <p className="text-xs text-muted-foreground">
            {selectedPatient?.phone}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-5">
          {/* Date and Time */}
          <div className="space-y-2">
            <Label className="text-sm">
              اختار اليوم والساعة اللي تناسبك *
            </Label>
            <AppointmentTimePicker
              selectedDate={selectedDate}
              onDateChange={(date) => {
                setSelectedDate(date);
                // Clear time when date changes
                setSelectedTime(null);
              }}
              selectedTime={selectedTime}
              onTimeChange={(time) => {
                setSelectedTime(time);
                // Combine date and time for form validation
                if (selectedDate && time) {
                  const time24 = convertTo24Hour(time);
                  if (time24) {
                    const appointmentDate = new Date(selectedDate);
                    appointmentDate.setHours(time24.hours, time24.minutes, 0, 0);
                    setValue("date", appointmentDate.toISOString(), {shouldValidate: true});
                  } else {
                    // Clear the date value if time conversion fails
                    setValue("date", "", {shouldValidate: true});
                  }
                } else {
                  // Clear the date value if either date or time is missing
                  setValue("date", "", {shouldValidate: true});
                }
              }}
              clinicAvailableTime={clinic?.available_time}
            />
            <input
              type="hidden"
              {...register("date", {
                required: "التاريخ والوقت مطلوب",
                validate: (value) => {
                  // Check if both date and time are selected
                  if (!selectedDate || !selectedTime) {
                    return "يرجى اختيار التاريخ والوقت";
                  }
                  
                  if (!value) {
                    return "تاريخ ووقت الموعد غير محدد";
                  }
                  
                  // Try to parse the date
                  const date = new Date(value);
                  if (isNaN(date.getTime())) {
                    return "تاريخ ووقت الموعد غير صحيح";
                  }
                  
                  // Check if date is valid (not in the past)
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const selectedDateObj = new Date(date);
                  selectedDateObj.setHours(0, 0, 0, 0);
                  
                  if (selectedDateObj < today) {
                    return "لا يمكن اختيار تاريخ سابق";
                  }

                  const validationError = validateWorkingHours(
                    value,
                    clinic?.available_time
                  );
                  if (validationError) {
                    return validationError;
                  }

                  return true;
                },
              })}
            />
            {errors.date && (
              <p className="text-sm text-red-500">{errors.date.message}</p>
            )}
            {(!selectedDate || !selectedTime) && !errors.date && (
              <p className="text-sm text-muted-foreground">
                يرجى اختيار التاريخ والوقت المناسب
              </p>
            )}
            {(!selectedDate || !selectedTime) && (
              <p className="text-sm text-muted-foreground">
                يرجى اختيار التاريخ والوقت المناسب
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm">
              نوع الحجز *
            </Label>
            <Textarea
              id="notes"
              placeholder="مثال: كشف، متابعة، استشارة..."
              className="text-sm"
              {...register("notes", {required: "نوع الحجز مطلوب"})}
            />
            {errors.notes && (
              <p className="text-sm text-red-500">{errors.notes.message}</p>
            )}
          </div>

          {/* Price (Read-only) */}
          <div className="space-y-2">
            <Label htmlFor="price" className="text-sm">
              سعر الحجز (جنيه)
            </Label>
            <Input
              id="price"
              type="text"
              value={clinic?.booking_price || 0}
              readOnly
              className="bg-muted text-sm"
            />
            <p className="text-xs text-muted-foreground">
              السعر محدد مسبقًا من قبل العيادة
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onChangePatient}
              className="flex-1">
              السابق
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={
                isLoading ||
                !selectedDate ||
                !selectedTime ||
                !isAppointmentFormValid(appointmentDate, clinic?.available_time)
              }>
              {isLoading ? "جاري الحجز..." : "حجز الموعد"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}