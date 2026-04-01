import { useState, useEffect } from "react";
import supabase from "../../services/supabase";
import { useOffline } from "../offline-mode/OfflineContext";
import { resolveClinicUuid } from "../../services/clinicIds";
import { db, STORE_NAMES } from "../offline-mode/offlineDB";

export function useUnreadNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { isOfflineMode, isOnline } = useOffline();

  useEffect(() => {
    let channel;
    let cancelled = false;

    const fetchUnreadCount = async () => {
      try {
        // 1. If offline, get count from IndexedDB
        if (isOfflineMode || !isOnline) {
          console.log("[useUnreadNotifications] Fetching unread count from IndexedDB (Offline)");
          const count = await db.table(STORE_NAMES.NOTIFICATIONS)
            .where('is_read')
            .equals(false)
            .and(n => !n.is_deleted)
            .count();
          
          if (!cancelled) {
            setUnreadCount(count);
            setLoading(false);
          }
          return;
        }

        // 2. Online path: Get current user and clinic_id
        const clinicId = await resolveClinicUuid();
        if (!clinicId) {
          if (!cancelled) setLoading(false);
          return;
        }

        // Get initial unread count from Supabase
        const { count, error } = await supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("clinic_id", clinicId)
          .eq("is_read", false);

        if (!error && !cancelled) {
          setUnreadCount(count || 0);
        }
        if (!cancelled) setLoading(false);

        // Set up real-time subscription for unread count
        channel = supabase
          .channel('unread-notifications-count')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `clinic_id=eq.${clinicId}`
            },
            (payload) => {
              if (payload.new && !payload.new.is_read) {
                setUnreadCount(prev => prev + 1);
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'notifications',
              filter: `clinic_id=eq.${clinicId}`
            },
            (payload) => {
              if (payload.old && payload.new) {
                const wasRead = payload.old.is_read;
                const isNowRead = payload.new.is_read;
                
                if (wasRead && !isNowRead) {
                  setUnreadCount(prev => prev + 1);
                } else if (!wasRead && isNowRead) {
                  setUnreadCount(prev => Math.max(0, prev - 1));
                }
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'notifications',
              filter: `clinic_id=eq.${clinicId}`
            },
            (payload) => {
              if (payload.old && !payload.old.is_read) {
                setUnreadCount(prev => Math.max(0, prev - 1));
              }
            }
          )
          .subscribe((status) => {
            if (status === 'CHANNEL_ERROR') {
              console.warn('Real-time subscription status: CHANNEL_ERROR (Likely offline)');
            } else {
              console.log('Real-time subscription status:', status);
            }
          });

      } catch (error) {
        console.error("Error in useUnreadNotifications:", error);
        if (!cancelled) setLoading(false);
      }
    };

    fetchUnreadCount();

    return () => {
      cancelled = true;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [isOfflineMode, isOnline]);

  return { unreadCount, loading };
}