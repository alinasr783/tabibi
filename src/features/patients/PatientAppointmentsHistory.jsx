import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { Card, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Eye, Calendar, Clock, Plus } from "lucide-react"
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
  completed: { label: "مكتمل", className: "bg-blue-800 text-white font-bold border border-blue-900 shadow-sm dark:bg-blue-600 dark:text-blue-50" },
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          سجل المواعيد
        </h3>
        <Button size="sm" variant="outline" onClick={() => setIsCreateDialogOpen(true)} className="gap-1.5 h-8 bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary hover:text-primary">
          <Plus className="w-3.5 h-3.5" />
          موعد جديد
        </Button>
      </div>

      {appointments && appointments.length > 0 ? (
        <div className="space-y-3">
          {appointments.map((appointment) => (
            <div
              key={appointment.id}
              onClick={() => navigate(`/appointments/${appointment.id}`)}
              className="cursor-pointer group relative"
            >
              <Card className="overflow-hidden border-border/60 hover:border-primary/30 hover:shadow-sm transition-all duration-300 bg-card">
                <CardContent className="p-0">
                  <div className="flex items-stretch">
                    {/* Date Column - Kept as requested but refined */}
                    <div className="w-20 flex flex-col items-center justify-center border-l border-border/60 bg-muted/5 p-2 shrink-0 group-hover:bg-primary/5 transition-colors">
                      <span className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                        {appointment.date ? format(new Date(appointment.date), "d") : "-"}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground uppercase">
                        {appointment.date ? format(new Date(appointment.date), "MMM", { locale: ar }) : "-"}
                      </span>
                    </div>

                    {/* Content - Modern Structure */}
                    <div className="flex-1 p-3.5 flex flex-col justify-center gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className={`text-[11px] px-2.5 py-0.5 rounded-md font-semibold border shadow-sm ${
                            statusConfig[appointment.status]?.className || statusConfig.pending.className
                          }`}>
                            {statusConfig[appointment.status]?.label || appointment.status}
                          </span>
                          {appointment.date && (
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                              <Clock className="w-3.5 h-3.5 text-muted-foreground/70" />
                              {format(new Date(appointment.date), "h:mm a", { locale: ar })}
                            </span>
                          )}
                        </div>
                        
                        {/* Price Badge - Minimalist */}
                        {appointment.price > 0 && (
                          <div className="flex items-center gap-1 text-xs font-semibold text-foreground/80 bg-muted/30 px-2 py-1 rounded-md border border-border/50">
                            {appointment.price}
                            <span className="text-[10px] text-muted-foreground font-medium">جنيه</span>
                          </div>
                        )}
                      </div>
                        
                      <div className="flex items-start gap-2 min-h-[20px]">
                        {appointment.notes ? (
                           <p className="text-sm text-foreground/80 line-clamp-1 leading-relaxed">{appointment.notes}</p>
                        ) : (
                           <span className="text-xs text-muted-foreground/50 italic">لا توجد ملاحظات إضافية</span>
                        )}
                      </div>
                    </div>

                    {/* Action Hint */}
                    <div className="w-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-r border-border/30 bg-muted/5">
                       <Eye className="w-4 h-4 text-primary/70" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed border-muted-foreground/20">
          <Calendar className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">مفيش مواعيد مسجلة للمريض ده</p>
          <Button variant="link" onClick={() => setIsCreateDialogOpen(true)} className="mt-2 h-auto p-0 text-primary">
            تسجيل أول موعد
          </Button>
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