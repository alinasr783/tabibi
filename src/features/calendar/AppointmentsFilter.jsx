import { useState } from "react"
import { Button } from "../../components/ui/button"
import { Card, CardContent } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select"
import { X } from "lucide-react"

const statusOptions = [
  { value: "all", label: "جميع الحالات" },
  { value: "pending", label: "قيد الانتظار" },
  { value: "confirmed", label: "مؤكد" },
  { value: "completed", label: "مكتمل" },
  { value: "cancelled", label: "ملغي" },
]

const timeOptions = [
  { value: "all", label: "الجميع" },
  { value: "upcoming", label: "القادمة" },
]

const sourceOptions = [
  { value: "all", label: "جميع المصادر" },
  { value: "booking", label: "من الموقع" },
  { value: "clinic", label: "من العيادة" },
]

export default function AppointmentsFilter({ onFilterChange }) {
  const [date, setDate] = useState("")
  const [status, setStatus] = useState("all")
  const [time, setTime] = useState("all")
  const [source, setSource] = useState("all")

  const handleDateChange = (newDate) => {
    setDate(newDate)
    const statusValue = status === "all" ? "" : status
    const timeValue = time === "all" ? "" : time
    const sourceValue = source === "all" ? "" : source
    onFilterChange({ date: newDate, status: statusValue, time: timeValue, source: sourceValue })
  }

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus)
    const statusValue = newStatus === "all" ? "" : newStatus
    const timeValue = time === "all" ? "" : time
    const sourceValue = source === "all" ? "" : source
    onFilterChange({ date, status: statusValue, time: timeValue, source: sourceValue })
  }

  const handleTimeChange = (newTime) => {
    setTime(newTime)
    const statusValue = status === "all" ? "" : status
    const timeValue = newTime === "all" ? "" : newTime
    const sourceValue = source === "all" ? "" : source
    onFilterChange({ date, status: statusValue, time: timeValue, source: sourceValue })
  }

  const handleSourceChange = (newSource) => {
    setSource(newSource)
    const statusValue = status === "all" ? "" : status
    const timeValue = time === "all" ? "" : time
    const sourceValue = newSource === "all" ? "" : newSource
    onFilterChange({ date, status: statusValue, time: timeValue, source: sourceValue })
  }

  const handleClearFilters = () => {
    setDate("")
    setStatus("all")
    setTime("all")
    setSource("all")
    onFilterChange({ date: "", status: "", time: "", source: "" })
  }

  return (
    <Card className="border border-gray-200 shadow-sm rounded-xl">
      <CardContent className="py-4">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">تاريخ الموعد</label>
              <div className="relative">
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full"
                />
                {date && (
                  <button
                    onClick={() => handleDateChange("")}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">الحالة</label>
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="اختر الحالة" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">الوقت</label>
              <Select value={time} onValueChange={handleTimeChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="اختر الوقت" />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">المصدر</label>
              <Select value={source} onValueChange={handleSourceChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="اختر المصدر" />
                </SelectTrigger>
                <SelectContent>
                  {sourceOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleClearFilters}
              className="h-10 border-gray-300 hover:bg-gray-50"
            >
              مسح الفلاتر
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}