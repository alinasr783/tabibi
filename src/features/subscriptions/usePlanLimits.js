import { useQuery } from "@tanstack/react-query";
import supabase from "../../services/supabase";

export default function usePlanLimits(clinicId) {
    return useQuery({
        queryKey: ["planLimits", clinicId],
        queryFn: async () => {
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
                return {
                    hasActiveSubscription: false,
                    maxPatients: 0,
                    maxAppointments: 0,
                    maxTreatmentTemplates: 0,
                    maxSecretaries: 0,
                    features: {
                        income: false,
                        whatsapp: false,
                        watermark: true
                    }
                };
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
                    return {
                        hasActiveSubscription: false,
                        maxPatients: 0,
                        maxAppointments: 0,
                        maxTreatmentTemplates: 0,
                        maxSecretaries: 0,
                        features: {
                            income: false,
                            whatsapp: false,
                            watermark: true
                        }
                    };
                }
                throw subscriptionError;
            }

            // Initialize planLimits with defaults, then override with plan data
            let planLimits = {
                hasActiveSubscription: true,
                maxPatients: 0,
                maxAppointments: 0,
                maxTreatmentTemplates: 0,
                maxSecretaries: 0,
                features: {
                    income: true,
                    whatsapp: false,
                    watermark: false
                }
            };

            // Parse plan limits from the embedded subscription data
            if (subscription.plans) {
                const rawLimits = subscription.plans.limits;

                try {
                    const limits = typeof rawLimits === 'string' 
                        ? JSON.parse(rawLimits) 
                        : rawLimits;

                    if (limits && typeof limits === 'object') {
                        if (limits.max_patients !== undefined) {
                            const n = Number(limits.max_patients);
                            planLimits.maxPatients = n === -1 ? Infinity : n;
                        }
                        
                        if (limits.max_appointments !== undefined) {
                            const n = Number(limits.max_appointments);
                            planLimits.maxAppointments = n === -1 ? Infinity : n;
                        }
                        
                        if (limits.max_treatment_templates !== undefined) {
                            const n = Number(limits.max_treatment_templates);
                            planLimits.maxTreatmentTemplates = n === -1 ? Infinity : n;
                        }

                        if (limits.secretary !== undefined || limits.max_secretaries !== undefined) {
                            const raw = limits.secretary !== undefined ? limits.secretary : limits.max_secretaries;
                            const n = Number(raw);
                            planLimits.maxSecretaries = n === -1 ? Infinity : n;
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

            return planLimits;
        },
        enabled: true,
        staleTime: 1000 * 60 * 30, // 30 minutes
    });
}
