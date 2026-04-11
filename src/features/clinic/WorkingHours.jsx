import { Button } from "../../components/ui/button"
import { Label } from "../../components/ui/label"
import { Calendar, X, Check } from "lucide-react"

function parseTimeParts(time24) {
  const raw = typeof time24 === "string" ? time24.trim() : "";
  const [hStr, mStr] = raw.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) {
    return { hour12: "09", minute: "00", period: "AM" };
  }
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = ((h % 12) || 12).toString().padStart(2, "0");
  const minute = String(m).padStart(2, "0");
  return { hour12, minute, period };
}

function toTime24({ hour12, minute, period }) {
  const h12 = Number(hour12);
  const m = Number(minute);
  if (!Number.isFinite(h12) || !Number.isFinite(m)) return "09:00";
  let h = h12 % 12;
  if (period === "PM") h += 12;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const hours12Options = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const minuteOptions = ["00", "15", "30", "45"];

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
          className="border rounded-[var(--radius)] p-2 sm:p-3 md:p-4 bg-muted/30 hover:bg-muted/50 transition-colors w-full max-w-full overflow-hidden">
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
                  {(() => {
                    const p = parseTimeParts(times.start);
                    return (
                      <div className="grid grid-cols-3 gap-1.5 w-full" id={`${day}-start`}>
                        <select
                          value={p.hour12}
                          onChange={(e) => onTimeChange(day, "start", toTime24({ ...p, hour12: e.target.value }))}
                          className="h-8 sm:h-9 md:h-10 rounded-[var(--radius)] border border-input bg-background px-2 text-xs sm:text-sm font-amiri"
                        >
                          {hours12Options.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                        <select
                          value={p.minute}
                          onChange={(e) => onTimeChange(day, "start", toTime24({ ...p, minute: e.target.value }))}
                          className="h-8 sm:h-9 md:h-10 rounded-[var(--radius)] border border-input bg-background px-2 text-xs sm:text-sm font-amiri"
                        >
                          {minuteOptions.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                        <select
                          value={p.period}
                          onChange={(e) => onTimeChange(day, "start", toTime24({ ...p, period: e.target.value }))}
                          className="h-8 sm:h-9 md:h-10 rounded-[var(--radius)] border border-input bg-background px-2 text-xs sm:text-sm font-amiri"
                        >
                          <option value="AM">ص</option>
                          <option value="PM">م</option>
                        </select>
                      </div>
                    );
                  })()}
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
                  {(() => {
                    const p = parseTimeParts(times.end);
                    return (
                      <div className="grid grid-cols-3 gap-1.5 w-full" id={`${day}-end`}>
                        <select
                          value={p.hour12}
                          onChange={(e) => onTimeChange(day, "end", toTime24({ ...p, hour12: e.target.value }))}
                          className="h-8 sm:h-9 md:h-10 rounded-[var(--radius)] border border-input bg-background px-2 text-xs sm:text-sm font-amiri"
                        >
                          {hours12Options.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                        <select
                          value={p.minute}
                          onChange={(e) => onTimeChange(day, "end", toTime24({ ...p, minute: e.target.value }))}
                          className="h-8 sm:h-9 md:h-10 rounded-[var(--radius)] border border-input bg-background px-2 text-xs sm:text-sm font-amiri"
                        >
                          {minuteOptions.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                        <select
                          value={p.period}
                          onChange={(e) => onTimeChange(day, "end", toTime24({ ...p, period: e.target.value }))}
                          className="h-8 sm:h-9 md:h-10 rounded-[var(--radius)] border border-input bg-background px-2 text-xs sm:text-sm font-amiri"
                        >
                          <option value="AM">ص</option>
                          <option value="PM">م</option>
                        </select>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
