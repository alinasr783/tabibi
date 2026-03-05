import { useNavigate } from "react-router-dom";
import { X, Calendar, User, Clock, Stethoscope, MessageCircle, FileText } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import { NotificationIcon, formatEgyptianDate } from "./notificationUtils";
import { useQuery } from "@tanstack/react-query";
import { getAppointmentById } from "../../services/apiAppointments";
import { useAuth } from "../auth/AuthContext";

export function NotificationDetailDialog({ open, onOpenChange, notification }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch appointment details if available
  const { data: appointment, isLoading } = useQuery({
    queryKey: ["appointment", notification?.appointment_id],
    queryFn: () => getAppointmentById(notification.appointment_id),
    enabled: !!notification?.appointment_id && open,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (!notification) return null;

  // Helper to construct message based on appointment data
  const getDynamicMessage = () => {
    if (!appointment) return notification.message;

    const patientName = appointment.patient?.name || "مريض";
    
    // Format appointment date/time
    let appDate = "غير محدد";
    let appTime = "غير محدد";
    
    if (appointment.date) {
        const appDateObj = new Date(appointment.date);
        if (!isNaN(appDateObj.getTime())) {
            appDate = appDateObj.toLocaleDateString("ar-EG", {
                day: "numeric", month: "long"
            });
            appTime = appDateObj.toLocaleTimeString("ar-EG", {
                hour: "numeric", minute: "numeric", hour12: true
            }).replace('ص', 'صباحاً').replace('م', 'مساءً');
        }
    }
    
    const type = appointment.notes?.trim() || appointment.type || "كشف";

    const isOnline = notification.type === 'online_appointment' || appointment.from === 'booking';

    if (isOnline) {
      return `المريض ${patientName} عمل حجز ${type} اونلاين و اختار يوم ${appDate} الساعة ${appTime}`;
    } else {
      // Clinic appointment
      const creatorName = user?.name || "مسؤول العيادة"; 
      return `تم إضافة حجز ${type} للمريض ${patientName} يوم ${appDate} الساعة ${appTime} عن طريق ${creatorName}`;
    }
  };

  const isOnlineNotification = notification?.type === 'online_appointment' || appointment?.from === 'booking';
  // Use the title from the notification itself if it's specific, otherwise fallback to logic
  const dialogTitle = (notification?.title && notification.title !== 'حجز جديد') 
    ? notification.title 
    : (isOnlineNotification ? "حجز جديد اونلاين" : "حجز جديد من العيادة");

  const message = (isLoading && notification.appointment_id) 
    ? "جاري تحميل التفاصيل..." 
    : (notification.appointment_id ? getDynamicMessage() : notification.message);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        overlayClassName="bg-transparent backdrop-blur-0"
        className="sm:max-w-[520px] text-right p-0 overflow-hidden gap-0 bg-transparent backdrop-blur-lg border border-primary/35 ring-1 ring-primary/20 shadow-none"
      >
        
        {/* Close Button */}
        <div className="absolute left-4 top-4 z-50">
           <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-foreground/80 hover:text-foreground rounded-full bg-transparent hover:bg-primary/10 backdrop-blur-sm transition-colors border border-primary/35"
              onClick={() => onOpenChange(false)}
           >
              <X className="h-4 w-4" />
              <span className="sr-only">إغلاق</span>
           </Button>
        </div>

        {/* Header */}
        <DialogHeader className="p-6 pb-4 text-right space-y-4 border-b border-primary/25 bg-transparent backdrop-blur-0">
          <div className="flex flex-col items-start gap-4 pr-0">
             <div className="flex items-center gap-3 w-full">
                <div className="p-3 bg-transparent rounded-2xl backdrop-blur-sm border border-primary/30">
                  <NotificationIcon type={notification.type} className="h-6 w-6 text-primary" />
                </div>
                <DialogTitle className="text-xl font-bold leading-normal text-foreground">
                    {dialogTitle}
                </DialogTitle>
             </div>
             
             <div className="flex items-center gap-2 text-sm font-medium text-foreground/80 mr-1 bg-transparent px-3 py-1 rounded-full border border-primary/25">
                <Calendar className="h-3.5 w-3.5 text-primary/90" />
                <span>{formatEgyptianDate(notification.created_at)}</span>
             </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh] bg-transparent">
          {notification.image_url && (
              <div className="mb-6 rounded-2xl overflow-hidden border border-white/40 bg-transparent backdrop-blur-md">
                  <img 
                      src={notification.image_url} 
                      alt="Notification" 
                      className="w-full h-auto max-h-[300px] object-contain mx-auto"
                  />
              </div>
          )}
          
          <div className="relative pl-2">
             <p className="pr-2 text-base leading-loose text-foreground whitespace-pre-wrap font-semibold">
               {message}
             </p>
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-6 pt-4 flex flex-row gap-4 justify-between bg-transparent border-t border-primary/25 backdrop-blur-0">
          {notification.appointment_id && appointment ? (
             <>
               <Button 
                 variant="outline"
                 onClick={() => {
                    if (appointment.patient?.phone) {
                        window.open(`https://wa.me/20${appointment.patient.phone.replace(/^0+/, '')}`, '_blank');
                    } else {
                        alert("رقم الهاتف غير متوفر");
                    }
                 }}
                 className="flex-1 h-11 gap-2 border-green-500/45 text-green-700 hover:bg-green-500/10 hover:text-green-800 hover:border-green-500/60 bg-transparent transition-all duration-300 rounded-xl shadow-none"
               >
                 <MessageCircle className="h-5 w-5" />
                 <span className="font-semibold text-base">واتساب</span>
               </Button>
               
               <Button 
                 variant="default"
                 onClick={() => {
                    navigate(`/appointments/${appointment.id}`);
                    onOpenChange(false);
                 }}
                  className="flex-1 h-11 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-none transition-all duration-300 rounded-xl border border-primary/20"
               >
                 <FileText className="h-5 w-5" />
                 <span className="font-semibold text-base">تفاصيل الحجز</span>
               </Button>
             </>
          ) : (
            // Fallback for non-appointment notifications
             <Button 
               variant="outline" 
               onClick={() => onOpenChange(false)}
               className="w-full h-11 border-primary/30 hover:bg-primary/10 rounded-xl backdrop-blur-sm bg-transparent"
             >
               إغلاق
             </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
