import { useQuery } from "@tanstack/react-query";
import supabase from "../../services/supabase";

export default function useSubscriptionUsage(clinicId) {
    return useQuery({
        queryKey: ["subscriptionUsage", clinicId],
        queryFn: async () => {
            console.log("=== DEBUG: useSubscriptionUsage started ===");
            
            let effectiveClinicId = clinicId;

            // Get current user's clinic_id if not provided
            if (!effectiveClinicId) {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error("Not authenticated");

                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('clinic_id')
                    .eq('user_id', session.user.id)
                    .single();

                if (userError) throw userError;
                effectiveClinicId = userData?.clinic_id;
            }

            if (!effectiveClinicId) {
                console.log("No clinic ID available, returning null");
                return null;
            }

            // Date range for the current month
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            
            // 2. Get monthly new patients count
            // Get all patients for the clinic
            const { data: allClinicPatients, error: allPatientsError } = await supabase
                .from("patients")
                .select("*")
                .eq("clinic_id", effectiveClinicId);

            if (allPatientsError) throw allPatientsError;

            // Filter manually for current month using 'created_at' field
            const monthlyPatientsList = (allClinicPatients || []).filter(patient => {
                if (!patient.created_at) return false;
                const createdAt = new Date(patient.created_at);
                return createdAt >= startOfMonth && createdAt <= endOfMonth;
            });

            const monthlyPatients = monthlyPatientsList.length;
            const totalPatients = (allClinicPatients || []).length;

            // 3. Get monthly appointments count
            // Get all appointments for the clinic
            const { data: allClinicAppointments, error: appointmentsError } = await supabase
                .from("appointments")
                .select("*")
                .eq("clinic_id", effectiveClinicId);

            if (appointmentsError) throw appointmentsError;

            // Filter manually for current month using 'date' field
            const monthAppointments = (allClinicAppointments || []).filter(app => {
                if (!app.date) return false;
                const appDate = new Date(app.date);
                return appDate >= startOfMonth && appDate <= endOfMonth;
            });

            const monthlyAppointments = monthAppointments.length;
            
            // Calculate online vs clinic appointments
            const onlineAppointments = monthAppointments.filter(app => {
                const source = app.from || app.source;
                return source && String(source).toLowerCase() === 'booking';
            }).length;

            const clinicAppointments = monthlyAppointments - onlineAppointments;

            // 4. Calculate total income from completed appointments
            const { data: completedAppointments, error: completedAppointmentsError } = await supabase
                .from("appointments")
                .select("price")
                .eq("clinic_id", effectiveClinicId)
                .eq("status", "completed");

            if (completedAppointmentsError) throw completedAppointmentsError;

            const totalIncome = completedAppointments.reduce((sum, appointment) => sum + (parseFloat(appointment.price) || 0), 0);

            const result = {
                totalPatients: totalPatients || 0,
                monthlyPatients: monthlyPatients || 0,
                monthlyAppointments: monthlyAppointments || 0,
                onlineAppointments: onlineAppointments || 0,
                clinicAppointments: clinicAppointments || 0,
                totalIncome: totalIncome || 0
            };

            console.log("Final usage stats:", result);
            return result;
        },
        enabled: true,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}
