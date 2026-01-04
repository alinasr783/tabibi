import { useEffect } from "react";
import supabase from "../../services/supabase";
import { addToGoogleCalendar, getIntegration } from "../../services/integrationService";
import useClinic from "../auth/useClinic";

/**
 * Hook to ensure all future appointments are synced to Google Calendar.
 * Uses deterministic Event IDs to prevent duplicates.
 * Runs once on mount when clinic is available.
 * Also listens for realtime updates to sync new online bookings immediately.
 */
export default function useGoogleCalendarSync() {
    const { data: clinic } = useClinic();

    useEffect(() => {
        if (!clinic?.clinic_uuid) return;

        // 1. Initial Sync of Future Appointments
        const syncPending = async () => {
            try {
                // Check if integration is active first
                const integration = await getIntegration('calendar');
                if (!integration) return;

                // Fetch future bookings
                // We sync ALL future bookings (pending/confirmed) to ensure consistency
                // regardless of source (booking vs clinic)
                const now = new Date().toISOString();
                const { data: appointments, error } = await supabase
                    .from("appointments")
                    .select("*")
                    .eq("clinic_id", clinic.clinic_uuid)
                    .gte("date", now)
                    .in("status", ["pending", "confirmed"]);

                if (error) {
                    console.error("Failed to fetch appointments for sync:", error);
                    return;
                }

                if (!appointments?.length) return;

                console.log("Syncing future appointments to Google Calendar...", appointments.length);

                // Process sequentially to avoid rate limits
                for (const appt of appointments) {
                    try {
                        // Use deterministic ID: tabibiapp + ID
                        // This allows Google to reject duplicates with 409 Conflict
                        // ensuring idempotency without needing extra DB state.
                        const googleEventId = `tabibiapp${appt.id}`;
                        await addToGoogleCalendar(appt, integration, googleEventId);
                    } catch (err) {
                        console.error("Sync failed for appointment:", appt.id, err);
                    }
                }
            } catch (err) {
                console.error("Google Calendar Sync process failed:", err);
            }
        };

        syncPending();

        // 2. Realtime Subscription for New Bookings
        // This ensures that when an online booking comes in (from='booking'),
        // it is immediately synced to the doctor's calendar if the dashboard is open.
        const channel = supabase
            .channel(`google_calendar_sync_${clinic.clinic_uuid}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'appointments',
                    filter: `clinic_id=eq.${clinic.clinic_uuid}`
                },
                async (payload) => {
                    // Only sync online bookings immediately
                    // Clinic bookings are handled by the createAppointment function directly,
                    // but duplicate sync is safe due to idempotency.
                    // We prioritize 'booking' source as that's the one missing direct sync.
                    if (payload.new?.from === 'booking') {
                        console.log("Realtime sync: New online booking detected", payload.new.id);
                        try {
                             // Pass null for integration to let it fetch/refresh inside
                             // Pass deterministic ID
                             const googleEventId = `tabibiapp${payload.new.id}`;
                             await addToGoogleCalendar(payload.new, null, googleEventId);
                        } catch (err) {
                            console.error("Realtime sync failed:", err);
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };

    }, [clinic?.clinic_uuid]);
}
