import { useQuery } from "@tanstack/react-query";
import supabase from "../../services/supabase";

export default function useSubscriptionUsage(clinicId) {
    return useQuery({
        queryKey: ["subscriptionUsage", clinicId],
        queryFn: async () => {
            console.log("=== DEBUG: useSubscriptionUsage started ===");
            console.log("Clinic ID parameter:", clinicId);
            
            // If clinicId is provided, use it directly
            if (clinicId) {
                console.log("Using provided clinic ID:", clinicId);
                
                // Get total patients count
                console.log("Fetching patient count for clinic_id:", clinicId);
                const { count: totalPatients, error: patientsError } = await supabase
                    .from("patients")
                    .select("*", { count: "exact", head: true })
                    .eq("clinic_id", clinicId);

                console.log("Patient count result:", { totalPatients, patientsError });

                if (patientsError) {
                    console.log("Patient count error:", patientsError);
                    throw patientsError;
                }

                // Get all appointments for the current month
                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                
                console.log("Date range for appointments:", {
                    startOfMonth: startOfMonth.toISOString(),
                    endOfMonth: endOfMonth.toISOString()
                });
                
                // Get total monthly appointments
                console.log("Fetching monthly appointments for clinic_id:", clinicId);
                const { count: monthlyAppointments, error: appointmentsError } = await supabase
                    .from("appointments")
                    .select("*", { count: "exact", head: true })
                    .eq("clinic_id", clinicId)
                    .gte("date", startOfMonth.toISOString())
                    .lte("date", endOfMonth.toISOString());

                console.log("Monthly appointments result:", { monthlyAppointments, appointmentsError });

                if (appointmentsError) {
                    console.log("Monthly appointments error:", appointmentsError);
                    throw appointmentsError;
                }

                // Get online booking appointments for the current month
                console.log("Fetching online appointments for clinic_id:", clinicId);
                const { count: onlineAppointments, error: onlineAppointmentsError } = await supabase
                    .from("appointments")
                    .select("*", { count: "exact", head: true })
                    .eq("clinic_id", clinicId)
                    .eq("from", "booking") // Changed from "source" to "from" based on schema
                    .gte("date", startOfMonth.toISOString())
                    .lte("date", endOfMonth.toISOString());

                console.log("Online appointments result:", { onlineAppointments, onlineAppointmentsError });

                if (onlineAppointmentsError) {
                    console.log("Online appointments error:", onlineAppointmentsError);
                    throw onlineAppointmentsError;
                }

                // Get clinic booking appointments for the current month
                const clinicAppointments = monthlyAppointments - onlineAppointments;
                console.log("Calculated clinic appointments:", clinicAppointments);

                // Calculate total income from completed appointments (similar to finance page)
                console.log("Calculating total income for clinic_id:", clinicId);
                
                // Get completed appointments for income calculation
                const { data: completedAppointments, error: completedAppointmentsError } = await supabase
                    .from("appointments")
                    .select("price")
                    .eq("clinic_id", clinicId)
                    .eq("status", "completed");

                console.log("Completed appointments result:", { completedAppointments, completedAppointmentsError });

                if (completedAppointmentsError) {
                    console.log("Completed appointments error:", completedAppointmentsError);
                    throw completedAppointmentsError;
                }

                // Calculate total revenue from completed appointments
                const totalIncome = completedAppointments.reduce((sum, appointment) => sum + (parseFloat(appointment.price) || 0), 0);
                console.log("Calculated total income:", totalIncome);

                const result = {
                    totalPatients: totalPatients || 0,
                    monthlyAppointments: monthlyAppointments || 0,
                    onlineAppointments: onlineAppointments || 0,
                    clinicAppointments: clinicAppointments || 0,
                    totalIncome: totalIncome || 0
                };

                console.log("Final usage stats:", result);
                console.log("=== DEBUG: useSubscriptionUsage completed ===");
                
                return result;
            }
            
            // Get current user's clinic_id if not provided
            const { data: { session } } = await supabase.auth.getSession();
            console.log("Session data:", session);
            
            if (!session) {
                console.log("No session, throwing error");
                throw new Error("Not authenticated");
            }

            console.log("No clinic ID provided, fetching from user table");
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('clinic_id')
                .eq('user_id', session.user.id)
                .single();

            console.log("User data result:", { userData, userError });

            if (userError) {
                console.log("User data error:", userError);
                throw userError;
            }

            const effectiveClinicId = userData?.clinic_id;
            console.log("Effective clinic ID:", effectiveClinicId);

            if (!effectiveClinicId) {
                console.log("No clinic ID available, returning null");
                return null;
            }

            // Get total patients count
            console.log("Fetching patient count for clinic_id:", effectiveClinicId);
            const { count: totalPatients, error: patientsError } = await supabase
                .from("patients")
                .select("*", { count: "exact", head: true })
                .eq("clinic_id", effectiveClinicId);

            console.log("Patient count result:", { totalPatients, patientsError });

            if (patientsError) {
                console.log("Patient count error:", patientsError);
                throw patientsError;
            }

            // Get all appointments for the current month
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            
            console.log("Date range for appointments:", {
                startOfMonth: startOfMonth.toISOString(),
                endOfMonth: endOfMonth.toISOString()
            });
            
            // Get all appointments for the current month
            console.log("Fetching monthly appointments data for clinic_id:", effectiveClinicId);
            const { data: monthAppointments, error: appointmentsError } = await supabase
                .from("appointments")
                .select("*")
                .eq("clinic_id", effectiveClinicId)
                .gte("date", startOfMonth.toISOString())
                .lte("date", endOfMonth.toISOString());

            console.log("Monthly appointments data:", monthAppointments);
            
            if (monthAppointments && monthAppointments.length > 0) {
                console.log("First appointment keys:", Object.keys(monthAppointments[0]));
                console.log("Unique 'from' values:", [...new Set(monthAppointments.map(a => a.from))]);
                console.log("Unique 'source' values (if any):", [...new Set(monthAppointments.map(a => a.source))]);
            }

            if (appointmentsError) {
                console.log("Monthly appointments error:", appointmentsError);
                throw appointmentsError;
            }

            const monthlyAppointments = monthAppointments.length;
            // Check both 'from' and 'source' fields and be case-insensitive
            const onlineAppointments = monthAppointments.filter(app => {
                const source = app.from || app.source;
                return source && String(source).toLowerCase() === 'booking';
            }).length;

            console.log("Calculated stats:", { monthlyAppointments, onlineAppointments });

            // Get clinic booking appointments for the current month
            const clinicAppointments = monthlyAppointments - onlineAppointments;
            console.log("Calculated clinic appointments:", clinicAppointments);

            // Calculate total income from completed appointments (similar to finance page)
            console.log("Calculating total income for clinic_id:", effectiveClinicId);
            
            // Get completed appointments for income calculation
            const { data: completedAppointments, error: completedAppointmentsError } = await supabase
                .from("appointments")
                .select("price")
                .eq("clinic_id", effectiveClinicId)
                .eq("status", "completed");

            console.log("Completed appointments result:", { completedAppointments, completedAppointmentsError });

            if (completedAppointmentsError) {
                console.log("Completed appointments error:", completedAppointmentsError);
                throw completedAppointmentsError;
            }

            // Calculate total revenue from completed appointments
            const totalIncome = completedAppointments.reduce((sum, appointment) => sum + (parseFloat(appointment.price) || 0), 0);
            console.log("Calculated total income:", totalIncome);

            const result = {
                totalPatients: totalPatients || 0,
                monthlyAppointments: monthlyAppointments || 0,
                onlineAppointments: onlineAppointments || 0,
                clinicAppointments: clinicAppointments || 0,
                totalIncome: totalIncome || 0
            };

            console.log("Final usage stats:", result);
            console.log("=== DEBUG: useSubscriptionUsage completed ===");
            
            return result;
        },
        enabled: true, // Always enable
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}