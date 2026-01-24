import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import supabase from "../../services/supabase";
import toast from "react-hot-toast";
import { useEffect } from "react";

export function useNotifications() {
  const queryClient = useQueryClient();
  
  const fetchNotifications = async ({ pageParam = 0 }) => {
    // Get current user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    // Get user's clinic_id
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("clinic_id")
      .eq("user_id", session.user.id)
      .single();

    if (userError) throw userError;
    if (!userData?.clinic_id) throw new Error("User has no clinic assigned");

    const PAGE_SIZE = 20;
    const from = pageParam * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    // Fetch notifications for the clinic
    const { data, error, count } = await supabase
      .from("notifications")
      .select(`
        id,
        title,
        message,
        type,
        is_read,
        created_at,
        patient_id,
        appointment_id,
        image_url,
        action_link,
        action_text,
        action_buttons
      `, { count: 'exact' })
      .eq("clinic_id", userData.clinic_id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("useNotifications: Error fetching notifications:", error);
      throw error;
    }
    
    return {
      notifications: data || [],
      nextPage: data.length === PAGE_SIZE ? pageParam + 1 : undefined,
      total: count
    };
  };

  // Set up real-time subscription
  useEffect(() => {
    const setupSubscription = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: userData } = await supabase
        .from("users")
        .select("clinic_id")
        .eq("user_id", session.user.id)
        .single();

      if (!userData?.clinic_id) return;

      const channel = supabase
        .channel('notifications-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `clinic_id=eq.${userData.clinic_id}`
          },
          (payload) => {
            console.log('Real-time notification received:', payload);
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            queryClient.invalidateQueries({ queryKey: ["notifications-stats"] });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupSubscription();
  }, [queryClient]);

  return useInfiniteQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });
}

export function useNotificationStats() {
  return useQuery({
    queryKey: ["notifications-stats"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data: userData } = await supabase
        .from("users")
        .select("clinic_id")
        .eq("user_id", session.user.id)
        .single();

      if (!userData?.clinic_id) return { total: 0, unread: 0 };

      const { count: totalCount } = await supabase
        .from("notifications")
        .select('*', { count: 'exact', head: true })
        .eq("clinic_id", userData.clinic_id);

      const { count: unreadCount } = await supabase
        .from("notifications")
        .select('*', { count: 'exact', head: true })
        .eq("clinic_id", userData.clinic_id)
        .eq("is_read", false);

      return {
        total: totalCount || 0,
        unread: unreadCount || 0
      };
    }
  });
}

export function useNotificationActions() {
  const queryClient = useQueryClient();

  const markAsRead = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-stats"] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: userData } = await supabase
        .from("users")
        .select("clinic_id")
        .eq("user_id", session.user.id)
        .single();

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("clinic_id", userData.clinic_id)
        .eq("is_read", false);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-stats"] });
      toast.success("تم تحديد الكل كمقروء");
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-stats"] });
      toast.success("تم حذف الاشعار بنجاح");
    },
  });

  return {
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
    deleteNotification: deleteNotification.mutate,
  };
}

