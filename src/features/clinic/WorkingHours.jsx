import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Calendar, X, Check } from "lucide-react"

export default function WorkingHours({
  availableTime,
  onTimeChange,
  onDayToggle,
  getDayName,
}) {
  return (
    <div className="space-y-1.5 sm:space-y-2 w-full max-w-full overflow-hidden">
      <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">
        حدد أوقات العمل اليومية للعيادة
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4 mt-1.5 sm:mt-2 w-full">
        {Object.entries(availableTime).map(([day, times]) => (
          <div
            key={day}
            className="border rounded-lg p-2 sm:p-3 md:p-4 bg-muted/30 hover:bg-muted/50 transition-colors w-full max-w-full overflow-hidden">
            <div className="flex justify-between items-center mb-2 sm:mb-3 w-full">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                <h4 className="font-medium capitalize text-xs sm:text-sm md:text-base truncate">
                  {getDayName(day)}
                </h4>
              </div>
              <Button
                type="button"
                variant={times.off ? "destructive" : "outline"}
                size="sm"
                onClick={() => onDayToggle(day)}
                className="h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs min-h-[28px] sm:min-h-[32px] flex-shrink-0 gap-1">
                {times.off ? (
                  <>
                    <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span>إجازة</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span>عمل</span>
                  </>
                )}
              </Button>
            </div>
            {!times.off && (
              <div className="flex items-center gap-1 sm:gap-2 w-full max-w-full">
                <div className="flex-1 min-w-0 max-w-[45%]">
                  <Label
                    htmlFor={`${day}-start`}
                    className="text-[10px] sm:text-xs text-muted-foreground block mb-0.5 sm:mb-1">
                    من
                  </Label>
                  <Input
                    id={`${day}-start`}
                    type="time"
                    value={times.start}
                    onChange={(e) => onTimeChange(day, "start", e.target.value)}
                    className="h-8 sm:h-9 md:h-10 text-xs sm:text-sm px-2 sm:px-3 py-1.5 w-full min-h-[36px] sm:min-h-[40px]"
                  />
                </div>
                <div className="flex items-center justify-center h-8 sm:h-9 md:h-10 shrink-0 px-0.5">
                  <span className="text-muted-foreground text-xs sm:text-sm">-</span>
                </div>
                <div className="flex-1 min-w-0 max-w-[45%]">
                  <Label
                    htmlFor={`${day}-end`}
                    className="text-[10px] sm:text-xs text-muted-foreground block mb-0.5 sm:mb-1">
                    إلى
                  </Label>
                  <Input
                    id={`${day}-end`}
                    type="time"
                    value={times.end}
                    onChange={(e) => onTimeChange(day, "end", e.target.value)}
                    className="h-8 sm:h-9 md:h-10 text-xs sm:text-sm px-2 sm:px-3 py-1.5 w-full min-h-[36px] sm:min-h-[40px]"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}