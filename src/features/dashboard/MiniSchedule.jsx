import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Clock, User, Plus } from "lucide-react";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { SkeletonLine } from "../../components/ui/skeleton";
import useTodayAppointments from "./useTodayAppointments";
import { Button } from "../../components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import AppointmentCreateDialog from "../calendar/AppointmentCreateDialog";

const statusMap = {
  pending: { label: "مستني", variant: "secondary" },
  confirmed: { label: "مؤكد", variant: "default" },
  completed: { label: "مكتمل", variant: "outline" },
  cancelled: { label: "اتلغى", variant: "destructive" },
  in_progress: { label: "جاي", variant: "info" },
};

export default function MiniSchedule() {
  const { data: appointments, isLoading } = useTodayAppointments();
  const navigate = useNavigate();
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="size-5 text-primary" />
            <h3 className="text-lg font-semibold">مواعيدك انهاردة</h3>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonLine key={i} className="h-16" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!appointments || appointments.length === 0) {
    return (
      <>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="size-5 text-primary" />
              <h3 className="text-lg font-semibold">مواعيدك انهاردة</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="size-12 mx-auto mb-2 opacity-30" />
              <p className="mb-4">مفيش مواعيد انهاردة</p>
              <Button 
                onClick={() => setShowAppointmentModal(true)} 
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 ml-2" />
                ضيف معاد جديد
              </Button>
            </div>
          </CardContent>
        </Card>
        <AppointmentCreateDialog 
          open={showAppointmentModal} 
          onClose={() => setShowAppointmentModal(false)} 
        />
      </>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="size-5 text-primary" />
              <h3 className="text-lg font-semibold">مواعيدك انهاردة</h3>
            </div>
            <Badge variant="secondary" className="text-xs">
              {appointments.length} {appointments.length === 1 ? "موعد" : "مواعيد"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {appointments.map((appointment) => (
            <div
              key={appointment.id}
              className="flex items-center justify-between p-3 rounded-[var(--radius)] border border-border hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => navigate(`/appointments/${appointment.id}`)}
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="size-10 rounded-full bg-primary/10 text-primary grid place-items-center">
                  <User className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{appointment.patient?.name || "مريض"}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                    <Clock className="size-3 flex-shrink-0" />
                    <span className="truncate">
                      {appointment.date
                        ? format(new Date(appointment.date), "hh:mm a", { locale: ar }) + " " + format(new Date(appointment.date), "dd/MM/yyyy", { locale: ar })
                        : "غير محدد"}
                    </span>
                  </div>
                </div>
              </div>
              <Badge variant={statusMap[appointment.status]?.variant || "secondary"}>
                {statusMap[appointment.status]?.label || appointment.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
      <AppointmentCreateDialog 
        open={showAppointmentModal} 
        onClose={() => setShowAppointmentModal(false)} 
      />
    </>
  );
}