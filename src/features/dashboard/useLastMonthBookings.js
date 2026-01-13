import { useState, useEffect } from "react";
import supabase from "../../services/supabase";
import { useUser } from "../auth";

export default function useLastMonthBookings() {
  const { user } = useUser();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.clinic_id) {
      setLoading(false);
      return;
    }

    const fetchLast30DaysBookings = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("Fetching bookings for clinic:", user.clinic_id);

        // Calculate date for last 30 days
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);

        const { count, error } = await supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("clinic_id", user.clinic_id.toString());
          // .eq("from", "booking"); // Removed temporarily for debugging
          // Removed date filter to show all online bookings
          // .gte("created_at", thirtyDaysAgo.toISOString())
          // .lte("created_at", today.toISOString());

        if (error) throw error;

        setCount(count || 0);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching last 30 days bookings:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchLast30DaysBookings();
  }, [user?.clinic_id]);

  return { count, loading, error };
}