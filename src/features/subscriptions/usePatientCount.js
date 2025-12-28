import { useQuery } from "@tanstack/react-query";
import supabase from "../../services/supabase";

export default function usePatientCount(clinicId) {
    return useQuery({
        queryKey: ["patientCount", clinicId],
        queryFn: async () => {
            console.log("=== DEBUG: usePatientCount started ===");
            console.log("Clinic ID parameter:", clinicId);
            
            // If clinicId is provided, use it directly
            if (clinicId) {
                console.log("Using provided clinic ID:", clinicId);
                
                const { count, error } = await supabase
                    .from("patients")
                    .select("*", { count: "exact", head: true })
                    .eq("clinic_id", clinicId.toString());  // Convert to string for compatibility

                console.log("Patient count result:", { count, error });

                if (error) {
                    console.log("Patient count error:", error);
                    return 0;
                }
                
                console.log("Returning patient count:", count || 0);
                console.log("=== DEBUG: usePatientCount completed ===");
                
                return count || 0;
            }
            
            // Get current user's clinic_id if not provided
            const { data: { session } } = await supabase.auth.getSession();
            console.log("Session data:", session);
            
            if (!session) {
                console.log("No session, returning 0");
                return 0;
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
                return 0;
            }

            const effectiveClinicId = userData?.clinic_id;
            console.log("Effective clinic ID:", effectiveClinicId);

            if (!effectiveClinicId) {
                console.log("No clinic ID available, returning 0");
                return 0;
            }
            
            const { count, error } = await supabase
                .from("patients")
                .select("*", { count: "exact", head: true })
                .eq("clinic_id", effectiveClinicId.toString());  // Convert to string for compatibility

            console.log("Patient count result:", { count, error });

            if (error) {
                console.log("Patient count error:", error);
                return 0;
            }
            
            console.log("Returning patient count:", count || 0);
            console.log("=== DEBUG: usePatientCount completed ===");
            
            return count || 0;
        },
        enabled: true, // Always enable
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}