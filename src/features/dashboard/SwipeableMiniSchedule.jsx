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
import { useUserPreferences } from '../../hooks/useUserPreferences';
import AppointmentCreateDialog from "../calendar/AppointmentCreateDialog";
import { useSubscriptionBlocking } from "../auth/useSubscriptionBlocking";
import SubscriptionBlockingModal from "../auth/SubscriptionBlockingModal";
import { useQuery } from "@tanstack/react-query";
import supabase from "../../services/supabase.js";
import { getUsersByAuthUids } from "../../services/apiAppointments";
import { getAppointmentTypes } from "../../services/apiAppointmentTypes";

// Helper function to get date display text based on offset
const getDateDisplayText = (offset, model) => {
  // If a custom date model is provided, use that; otherwise default to the current model
  const dateModel = model;
  if (dateModel === 'date') {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + offset);
    const dayName = format(targetDate, 'EEEE', { locale: ar });
    const dateStr = format(targetDate, 'd MMM', { locale: ar });
    return `${dayName}, ${dateStr}`;
  }
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

// Function to fetch appointments for a specific date across all clinics
async function getAppointmentsForDate(dateOffset = 0) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  // Import the clinic access function
  const { getAllMyClinicIds } = await import('../../services/clinicAccess');
  
  // Get ALL clinic IDs that user owns or is member of (for multi-branch support)
  let clinicIds = [];
  try {
    clinicIds = await getAllMyClinicIds();
  } catch (e) {
    console.warn("Could not get all clinics, falling back to user clinic", e);
    const { data: userData } = await supabase
      .from("users")
      .select("clinic_id")
      .eq("user_id", session.user.id)
      .single();
    if (userData?.clinic_id) {
      clinicIds = [userData.clinic_id];
    }
  }

  console.log("getAppointmentsForDate - All clinic IDs:", clinicIds);

  if (clinicIds.length === 0) throw new Error("User has no clinic assigned");

  // Calculate the target date based on offset (use local time)
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + dateOffset);
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  const targetDateString = `${year}-${month}-${day}`;

  console.log("getAppointmentsForDate - Querying for date:", targetDateString, "offset:", dateOffset);

// Get all appointments with patient info for the target date across all clinics
  // Use like to match date strings since stored dates might have time component
  const { data: appointments, error } = await supabase
    .from("appointments")
    .select(`
      id,
      date,
      status,
      clinic_id,
      created_by_user_id,
      appointment_type,
      patient:patients(name)
    `)
    .in("clinic_id", clinicIds)
    .like("date", targetDateString + "%")
    .order("date", { ascending: true })
    .limit(10);

  console.log("getAppointmentsForDate - Found appointments:", appointments?.length, appointments?.map(a => ({ id: a.id, date: a.date, clinic: a.clinic_id })))
  
  if (error) {
    console.error("getAppointmentsForDate - Error:", error)
    throw error
  }

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
  const { data: preferences } = useUserPreferences();
  const dateModelValue = preferences?.home_date_model ?? 'days';
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const { checkAction, isBlockingModalOpen, closeBlockingModal, subscriptionStatus } = useSubscriptionBlocking();
  const navigate = useNavigate();
  
// Fetch appointments for the current date offset
  const { data: appointments, isLoading, isError, error } = useQuery({
    queryKey: ["appointments", dateOffset],
    queryFn: () => getAppointmentsForDate(dateOffset),
    keepPreviousData: true,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Fetch creators for appointments
  const creatorIds = [...new Set(appointments?.map(a => a.created_by_user_id).filter(Boolean) || [])];
  const { data: creatorsMap = [] } = useQuery({
    queryKey: ["appointmentCreators", creatorIds],
    queryFn: () => getUsersByAuthUids(creatorIds),
    enabled: creatorIds.length > 0
  });

  // Fetch appointment types
  const { data: appointmentTypes = [] } = useQuery({
    queryKey: ["appointmentTypes"],
    queryFn: getAppointmentTypes,
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
            <h3 className="text-lg font-semibold">{getDateDisplayText(dateOffset, dateModelValue)}</h3>
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
            <h3 className="text-lg font-semibold">{getDateDisplayText(dateOffset, dateModelValue)}</h3>
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
                <h3 className="text-lg font-semibold">{getDateDisplayText(dateOffset, dateModelValue)}</h3>
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
              <p className="mb-4">مفيش مواعيد {getDateDisplayText(dateOffset, dateModelValue).replace("مواعيدك", "")}</p>
              <Button 
                onClick={() => checkAction(() => setShowAppointmentModal(true))} 
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
        <SubscriptionBlockingModal 
          isOpen={isBlockingModalOpen} 
          onClose={closeBlockingModal} 
          status={subscriptionStatus} 
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
              <h3 className="text-lg font-semibold">{getDateDisplayText(dateOffset, dateModelValue)}</h3>
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
                  className="flex items-center justify-between p-3 rounded-[var(--radius)] border border-border hover:bg-accent/50 transition-colors cursor-pointer relative overflow-hidden"
                  style={{ 
                    borderLeftWidth: '6px',
                    borderLeftColor: (() => {
                      const type = appointmentTypes.find(t => t.id === appointment.appointment_type);
                      return type?.color || '#e5e7eb';
                    })(),
                    backgroundColor: (() => {
                      const type = appointmentTypes.find(t => t.id === appointment.appointment_type);
                      return type?.color ? `${type.color}08` : 'transparent';
                    })()
                  }}
                  onClick={() => navigate(`/appointments/${appointment.id}`)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div 
                      className="size-10 rounded-full grid place-items-center"
                      style={{ 
                        backgroundColor: (() => {
                          const type = appointmentTypes.find(t => t.id === appointment.appointment_type);
                          return type?.color ? `${type.color}20` : '#f3f4f6';
                        })(),
                        color: (() => {
                          const type = appointmentTypes.find(t => t.id === appointment.appointment_type);
                          return type?.color || '#1AA19C';
                        })()
                      }}
                    >
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
                      {appointment.from === "booking" ? (
                        <div className="text-xs text-green-600 mt-1 truncate">حجز إلكتروني</div>
                      ) : appointment.created_by_user_id ? (
                        (() => {
                          const creator = creatorsMap.find(u => u.user_id === appointment.created_by_user_id);
                          return creator ? (
                            <div className="text-xs text-blue-600 mt-1 truncate">
                              أنشأه: {creator.name} ({creator.role === "doctor" ? "دكتور" : creator.role === "secretary" ? "س" : creator.role})
                            </div>
                          ) : null;
                        })()
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {appointment.appointment_type && (() => {
                      const type = appointmentTypes.find(t => t.id === appointment.appointment_type);
                      return type ? (
                        <div 
                          className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium"
                          style={{ backgroundColor: type.color }}
                        >
                          {type.name}
                        </div>
                      ) : null;
                    })()}
                    <Badge variant={statusMap[appointment.status]?.variant || "secondary"}>
                      {statusMap[appointment.status]?.label || appointment.status}
                    </Badge>
                  </div>
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
