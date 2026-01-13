import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { Card, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Eye, Calendar, Clock, DollarSign, Plus } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog"
import AppointmentCreateDialog from "../calendar/AppointmentCreateDialog"

const statusConfig = {
  pending: { label: "منتظر", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200" },
  confirmed: { label: "مؤكد", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200" },
  completed: { label: "مكتمل", className: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200" },
  cancelled: { label: "ملغي", className: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200" },
}

export default function PatientAppointmentsHistory({ appointments, isLoading, patientId, patient }) {
  const navigate = useNavigate()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-5 w-24 bg-muted rounded-[var(--radius)] animate-pulse"></div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted rounded-[var(--radius)] animate-pulse"></div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">المواعيد</h3>
        <Button size="sm" onClick={() => setIsCreateDialogOpen(true)} className="gap-1.5">
          <Plus className="w-4 h-4" />
          موعد جديد
        </Button>
      </div>

      {appointments && appointments.length > 0 ? (
        <div className="space-y-2">
          {appointments.map((appointment) => (
            <div
              key={appointment.id}
              onClick={() => navigate(`/appointments/${appointment.id}`)}
              className="cursor-pointer"
            >
              <Card className="hover:bg-muted/50 transition-colors group">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-[var(--radius)] ${
                          statusConfig[appointment.status]?.className || statusConfig.pending.className
                        }`}>
                          {statusConfig[appointment.status]?.label || appointment.status}
                        </span>
                        {appointment.price > 0 && (
                          <span className="flex items-center gap-1 text-xs font-medium">
                            <DollarSign className="w-3.5 h-3.5" />
                            {appointment.price} جنيه
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {appointment.date 
                            ? format(new Date(appointment.date), "d MMM yyyy", { locale: ar })
                            : "غير محدد"
                          }
                        </span>
                        {appointment.date && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {format(new Date(appointment.date), "h:mm a", { locale: ar })}
                          </span>
                        )}
                      </div>
                      {appointment.notes && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{appointment.notes}</p>
                      )}
                    </div>
                    <Eye className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-sm">
          مفيش مواعيد للمريض ده
        </div>
      )}

      {/* Create Appointment Dialog */}
      <AppointmentCreateDialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        initialPatient={patient}
      />
    </div>
  )
}