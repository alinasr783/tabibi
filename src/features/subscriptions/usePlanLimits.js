import { useQuery } from "@tanstack/react-query";
import supabase from "../../services/supabase";

export default function usePlanLimits(clinicId) {
    return useQuery({
        queryKey: ["planLimits", clinicId],
        queryFn: async () => {
            console.log("=== DEBUG: usePlanLimits started ===");
            console.log("Clinic ID parameter:", clinicId);
            
            // If clinicId is provided, try to get plan limits directly
            if (clinicId) {
                console.log("Using provided clinic ID:", clinicId);
                
                // Get active subscription with embedded plan data
                console.log("Fetching active subscription with plan data for clinic_id:", clinicId);
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
                    .eq('clinic_id', clinicId)
                    .eq('status', 'active')
                    .single();

                console.log("Subscription query result:", { subscription, subscriptionError });

                if (subscriptionError) {
                    // If no active subscription found, return free plan limits
                    if (subscriptionError.code === "PGRST116") {
                        console.log("No active subscription found, returning UNLIMITED plan limits (User Override)");
                        return {
                            maxPatients: Infinity, 
                            maxAppointments: Infinity, 
                            maxTreatmentTemplates: Infinity, 
                            features: {
                                income: true,
                                whatsapp: false,
                                watermark: false
                            }
                        };
                    }
                    console.log("Subscription error:", subscriptionError);
                    throw subscriptionError;
                }

                // Parse plan limits from the embedded subscription data
                let planLimits = {
                    maxPatients: Infinity, // User Override
                    maxAppointments: Infinity, // User Override
                    maxTreatmentTemplates: Infinity, // User Override
                    features: {
                        income: true,
                        whatsapp: false,
                        watermark: false
                    }
                };

                // If we have plan data, parse the limits
                if (subscription.plans && subscription.plans.limits) {
                    try {
                        console.log("Parsing plan limits (Ignored by User Override):", subscription.plans.limits);
                        // We parse but don't apply the limits to keep them unlimited
                        /*
                        const limits = typeof subscription.plans.limits === 'string' 
                            ? JSON.parse(subscription.plans.limits) 
                            : subscription.plans.limits;
                        
                        console.log("Parsed limits object:", limits);
                        
                        if (limits.max_patients !== undefined) {
                            planLimits.maxPatients = limits.max_patients;
                        }
                        
                        if (limits.max_appointments !== undefined) {
                            planLimits.maxAppointments = limits.max_appointments;
                        }
                        
                        if (limits.max_treatment_templates !== undefined) {
                            planLimits.maxTreatmentTemplates = limits.max_treatment_templates;
                        }
                        
                        if (limits.features) {
                            planLimits.features = {
                                ...planLimits.features,
                                ...limits.features
                            };
                        }
                        */
                    } catch (e) {
                        console.warn("Failed to parse plan limits:", e);
                    }
                }

                console.log("Final plan limits:", planLimits);
                console.log("=== DEBUG: usePlanLimits completed ===");
                
                return planLimits;
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
                console.log("No clinic ID available, returning UNLIMITED plan limits (User Override)");
                return {
                    maxPatients: Infinity, 
                    maxAppointments: Infinity, 
                    maxTreatmentTemplates: Infinity, 
                    features: {
                        income: true,
                        // whatsapp: true, // Removed
                        watermark: false
                    }
                };
            }

            // Get active subscription with embedded plan data
            console.log("Fetching active subscription with plan data for clinic_id:", effectiveClinicId);
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

            console.log("Subscription query result:", { subscription, subscriptionError });

            if (subscriptionError) {
                    // If no active subscription found, return free plan limits
                    if (subscriptionError.code === "PGRST116") {
                        console.log("No active subscription found, returning UNLIMITED plan limits (User Override)");
                        return {
                            maxPatients: Infinity, 
                            maxAppointments: Infinity, 
                            maxTreatmentTemplates: Infinity, 
                            features: {
                                income: true,
                                whatsapp: true,
                                watermark: false
                            }
                        };
                    }
                    console.log("Subscription error:", subscriptionError);
                    throw subscriptionError;
                }

                // Parse plan limits from the embedded subscription data
                let planLimits = {
                    maxPatients: Infinity, // User Override
                    maxAppointments: Infinity, // User Override
                    maxTreatmentTemplates: Infinity, // User Override
                    features: {
                        income: true,
                        whatsapp: false,
                        watermark: false
                    }
                };

                // If we have plan data, parse the limits
                if (subscription.plans && subscription.plans.limits) {
                    try {
                        console.log("Parsing plan limits (Ignored by User Override):", subscription.plans.limits);
                        /*
                        const limits = typeof subscription.plans.limits === 'string' 
                            ? JSON.parse(subscription.plans.limits) 
                            : subscription.plans.limits;
                        
                        console.log("Parsed limits object:", limits);
                        
                        if (limits.max_patients !== undefined) {
                            planLimits.maxPatients = limits.max_patients;
                            console.log("Set maxPatients to:", limits.max_patients);
                        }
                        
                        if (limits.max_appointments !== undefined) {
                            planLimits.maxAppointments = limits.max_appointments;
                            console.log("Set maxAppointments to:", limits.max_appointments);
                        }
                        
                        if (limits.max_treatment_templates !== undefined) {
                            planLimits.maxTreatmentTemplates = limits.max_treatment_templates;
                            console.log("Set maxTreatmentTemplates to:", limits.max_treatment_templates);
                        }
                        
                        if (limits.features) {
                            planLimits.features = {
                                ...planLimits.features,
                                ...limits.features
                            };
                            console.log("Set features to:", limits.features);
                        }
                        */
                    } catch (e) {
                        console.warn("Failed to parse plan limits:", e);
                    }
                }

            console.log("Final plan limits:", planLimits);
            console.log("=== DEBUG: usePlanLimits completed ===");
            
            return planLimits;
        },
        enabled: true, // Always enable
        staleTime: 1000 * 60 * 30, // 30 minutes
    });
}