import { useQuery } from "@tanstack/react-query";
import supabase from "../../services/supabase";

export default function usePlanLimits(clinicId) {
    return useQuery({
        queryKey: ["planLimits", clinicId],
        queryFn: async () => {
            console.log("=== DEBUG: usePlanLimits started ===");
            
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

            // Default limits for "No Subscription" or "Free" state
            const defaultLimits = {
                maxPatients: 10, // Small limit for free/no subscription
                maxAppointments: 20,
                maxTreatmentTemplates: 5,
                features: {
                    income: true,
                    whatsapp: false,
                    watermark: true
                }
            };

            if (!effectiveClinicId) {
                console.log("No clinic ID available, returning default limits");
                return defaultLimits;
            }

            // Get active subscription with embedded plan data
            const { data: subscription, error: subscriptionError } = await supabase
                .from('subscriptions')
                .select(`
                    *,
                    plans:plan_id (
                        id,
                        name,
                        price,
                        limits
                    )
                `)
                .eq('clinic_id', effectiveClinicId)
                .eq('status', 'active')
                .single();

            if (subscriptionError) {
                if (subscriptionError.code === "PGRST116") {
                    console.log("No active subscription found, returning default limits");
                    return defaultLimits;
                }
                throw subscriptionError;
            }

            // Initialize planLimits with defaults, then override with plan data
            let planLimits = {
                maxPatients: 0,
                maxAppointments: 0,
                maxTreatmentTemplates: 0,
                features: {
                    income: true,
                    whatsapp: false,
                    watermark: false
                }
            };

            console.log("Subscription raw data:", subscription);

            // Parse plan limits from the embedded subscription data
            if (subscription.plans) {
                const rawLimits = subscription.plans.limits;
                console.log("Raw limits from DB:", rawLimits);

                try {
                    const limits = typeof rawLimits === 'string' 
                        ? JSON.parse(rawLimits) 
                        : rawLimits;
                    
                    console.log("Parsed limits:", limits);

                    if (limits && typeof limits === 'object') {
                        if (limits.max_patients !== undefined) {
                            planLimits.maxPatients = Number(limits.max_patients);
                        }
                        
                        if (limits.max_appointments !== undefined) {
                            planLimits.maxAppointments = Number(limits.max_appointments);
                        }
                        
                        if (limits.max_treatment_templates !== undefined) {
                            planLimits.maxTreatmentTemplates = Number(limits.max_treatment_templates);
                        }
                        
                        if (limits.features) {
                            planLimits.features = {
                                ...planLimits.features,
                                ...limits.features
                            };
                        }
                    }
                } catch (e) {
                    console.warn("Failed to parse plan limits:", e);
                }
            }

            console.log("Final plan limits:", planLimits);
            return planLimits;
        },
        enabled: true,
        staleTime: 1000 * 60 * 30, // 30 minutes
    });
}
