import { useState } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Clock, User, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { SkeletonLine } from "../../components/ui/skeleton";
import { Button } from "../../components/ui/button";
import { ScrollArea, ScrollBar } from "../../components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import AppointmentCreateDialog from "../calendar/AppointmentCreateDialog";
import { useQuery } from "@tanstack/react-query";
import supabase from "../../services/supabase.js";

// Helper function to get date display text based on offset
const getDateDisplayText = (offset) => {
  if (offset === 0) return "مواعيدك انهاردة";  if (offset === 1) return "مواعيدك بكرة";
  if (offset === 2) return "مواعيدك بعد بكرة";
  if (offset === 3) return "مواعيدك بعد يومين"
  if (offset > 3) return `مواعيد بعد ${offset} أيام`;
  
  if (offset === -1) return "مواعيدك امبارح";
  if (offset === -2) return "مواعيد اول امبارح";
  if (offset === -3) return "مواعيدك من يومين";
  if (offset < -3) return `مواعيدك من ${Math.abs(offset)} أيام`;
  
  return "مواعيدك إنهااردة";
};

// Function to fetch appointments for a specific date
async function getAppointmentsForDate(dateOffset = 0) {
  // Get current user's clinic_id
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const { data: userData } = await supabase
    .from("users")
    .select("clinic_id")
    .eq("user_id", session.user.id)
    .single();

  if (!userData?.clinic_id) throw new Error("User has no clinic assigned");

  const clinicId = userData.clinic_id;

  // Calculate the target date based on offset
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + dateOffset);
  const targetDateString = targetDate.toISOString().split('T')[0];

  // Get all appointments with patient info for the target date
  const { data: appointments, error } = await supabase
    .from("appointments")
    .select(`
      id,
      date,
      status,
      patient:patients(name)
    `)
    .eq("clinic_id", clinicId)
    .gte("date", targetDateString + "T00:00:00")
    .lte("date", targetDateString + "T23:59:59")
    .order("date", { ascending: true })
    .limit(5);

  if (error) throw error;

  return appointments || [];
}

const statusMap = {
  pending: { label: "مستني", variant: "secondary" },
  confirmed: { label: "مؤكد", variant: "default" },
  completed: { label: "مكتمل", variant: "outline" },
  cancelled: { label: "اتلغى", variant: "destructive" },
  in_progress: { label: "جاي", variant: "info" },
};

export default function SwipeableMiniSchedule() {
  const [dateOffset, setDateOffset] = useState(0);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const navigate = useNavigate();
  
  // Fetch appointments for the current date offset
  const { data: appointments, isLoading, isError, error } = useQuery({
    queryKey: ["appointments", dateOffset],
    queryFn: () => getAppointmentsForDate(dateOffset),
    keepPreviousData: true,
  });

  // Navigation functions
  const goToNextDay = () => {
    setDateOffset(prev => prev + 1);
  };

  const goToPrevDay = () => {
    setDateOffset(prev => prev - 1);
  };

  if (isLoading && !appointments) {
    return (
      <Card className="relative z-10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="size-5 text-primary" />
              <h3 className="text-lg font-semibold">{getDateDisplayText(dateOffset)}</h3>
            </div>
            <div className="flex gap-1">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={goToPrevDay}
                disabled={dateOffset <= -30}
              >
                <ChevronRight className="size-4" />
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={goToNextDay}
                disabled={dateOffset >= 30}
              >
                <ChevronLeft className="size-4" />
              </Button>
            </div>
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

  if (isError) {
    return (
      <Card className="relative z-10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="size-5 text-primary" />
              <h3 className="text-lg font-semibold">{getDateDisplayText(dateOffset)}</h3>
            </div>
            <div className="flex gap-1">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={goToPrevDay}
                disabled={dateOffset <= -30}
              >
                <ChevronRight className="size-4" />
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={goToNextDay}
                disabled={dateOffset >= 30}
              >
                <ChevronLeft className="size-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-destructive">
            <p>حدث خطأ أثناء تحميل المواعيد: {error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if ((!appointments || appointments.length === 0) && !isLoading) {
    return (
      <>
        <Card className="relative z-10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="size-5 text-primary" />
                <h3 className="text-lg font-semibold">{getDateDisplayText(dateOffset)}</h3>
              </div>
              <div className="flex gap-1">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={goToPrevDay}
                  disabled={dateOffset <= -30}
                >
                  <ChevronRight className="size-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={goToNextDay}
                  disabled={dateOffset >= 30}
                >
                  <ChevronLeft className="size-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="size-12 mx-auto mb-2 opacity-30 text-primary" />
              <p className="mb-4">مفيش مواعيد {getDateDisplayText(dateOffset).replace("مواعيدك", "")}</p>
              <Button 
                onClick={() => setShowAppointmentModal(true)} 
                className="hover:bg-primary text-white bg-primary"
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
      <Card className="relative z-10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="size-5 text-primary" />
              <h3 className="text-lg font-semibold">{getDateDisplayText(dateOffset)}</h3>
            </div>
            <div className="flex gap-1">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={goToPrevDay}
                disabled={dateOffset <= -30}
              >
                <ChevronRight className="size-4" />
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={goToNextDay}
                disabled={dateOffset >= 30}
              >
                <ChevronLeft className="size-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <div className="px-4 pb-4">
          <ScrollArea className="h-96 rounded-[var(--radius)] border border-border">
            <div className="space-y-2 p-4">
              {appointments && appointments.map((appointment) => (
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
            </div>
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        </div>
      </Card>
      <AppointmentCreateDialog 
        open={showAppointmentModal} 
        onClose={() => setShowAppointmentModal(false)} 
      />
    </>
  );
}