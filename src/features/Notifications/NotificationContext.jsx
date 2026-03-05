import { createContext, useContext, useState, useEffect, useRef } from "react";
import supabase from "../../services/supabase";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { NotificationToast } from "./NotificationToast";
import { NotificationDetailDialog } from "./NotificationDetailDialog";
import { useNotificationActions } from "./useNotifications";
import { useUserPreferences } from "../../hooks/useUserPreferences";

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [selectedNotification, setSelectedNotification] = useState(null);
  const queryClient = useQueryClient();
  const { markAsRead, deleteNotification } = useNotificationActions();
  
  // Get user preferences for filtering toasts
  const { data: preferences } = useUserPreferences();
  const preferencesRef = useRef(preferences);

  // Keep ref in sync to access latest prefs in closure without re-subscribing
  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  // Function to open notification details
  const openNotification = (notification) => {
    setSelectedNotification(notification);
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
  };

  // Real-time subscription for TOASTS
  useEffect(() => {
    let channel;
    
    const setupSubscription = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: userData } = await supabase
        .from("users")
        .select("clinic_id")
        .eq("user_id", session.user.id)
        .single();

      if (!userData?.clinic_id) return;

      channel = supabase
        .channel('global-notifications-toast')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `clinic_id=eq.${userData.clinic_id}`
          },
          (payload) => {
            const newNotification = payload.new;
            const currentPrefs = preferencesRef.current;

            // 1. Check if Toasts are enabled globally
            // Default to true if prefs not loaded yet
            const isToastEnabled = currentPrefs?.toast_notifications_enabled !== false;
            if (!isToastEnabled) return;

            // 2. Check Notification Types
            if (currentPrefs?.notification_types) {
              let prefKey = null;
              const type = newNotification.type;
              
              if (type === 'appointment' || type === 'online_appointment') prefKey = 'appointments';
              else if (type === 'wallet' || type === 'finance' || type === 'payment') prefKey = 'financial';
              else if (type === 'subscription') prefKey = 'subscription';
              else if (type === 'app') prefKey = 'apps';
              else if (type === 'reminder') prefKey = 'reminders';
              else if (type === 'patient') prefKey = 'patients';
              else if (type === 'system' || type === 'alert' || type === 'info') prefKey = 'system';
              
              // If explicitly disabled in preferences, skip
              if (prefKey && currentPrefs.notification_types[prefKey] === false) {
                return;
              }
            }

            // 3. Determine Duration
            const duration = (currentPrefs?.toast_duration || 3) * 1000;

            // Show Toast
            toast.custom((id) => (
              <NotificationToast 
                id={id}
                notification={newNotification} 
                onClick={openNotification} 
              />
            ), {
              duration: duration,
              id: `notification-${newNotification.id}`, // Prevent duplicates
            });

            // Invalidate queries to update lists and counts elsewhere
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            queryClient.invalidateQueries({ queryKey: ["notifications-stats"] });
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [queryClient]); 

  return (
    <NotificationContext.Provider value={{ openNotification }}>
      {children}
      
      {/* Global Notification Detail Modal */}
      <NotificationDetailDialog 
        open={!!selectedNotification} 
        onOpenChange={(open) => !open && setSelectedNotification(null)}
        notification={selectedNotification}
        onDelete={deleteNotification}
      />
    </NotificationContext.Provider>
  );
}

export const useNotificationContext = () => useContext(NotificationContext);
