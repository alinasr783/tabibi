import supabase from "./supabase";
import * as dataService from "./dataService"
import { shouldUseOfflineMode, getClinicId } from "./apiOfflineMode"
import { requireActiveSubscription } from "./subscriptionEnforcement";

export async function createPatientPlan(payload) {
    const clinicUuid = await getClinicId();
    if (!clinicUuid) throw new Error("User has no clinic assigned")

    if (shouldUseOfflineMode()) {
        const patientPlanData = {
            ...payload,
            clinic_id: clinicUuid,
            updated_at: new Date().toISOString()
        }
        return dataService.create("patient_plans", patientPlanData)
    }

    await requireActiveSubscription(clinicUuid);

    // Add clinic_id to the patient plan data
    const patientPlanData = {
        ...payload,
        clinic_id: clinicUuid
    };

    const { data, error } = await supabase
        .from("patient_plans")
        .insert(patientPlanData)
        .select()
        .single();

    if (error) {
        console.error("Error creating patient plan:", error);
        throw error;
    }

    return data;
}

export async function getPatientPlan(planId) {
    const clinicUuid = await getClinicId();
    if (!clinicUuid) throw new Error("User has no clinic assigned")

    if (shouldUseOfflineMode()) {
        const plans = await dataService.get("patient_plans", { id: planId });
        return plans[0] || null;
    }

    const { data, error } = await supabase
        .from("patient_plans")
        .select(`
            id,
            total_sessions,
            completed_sessions,
            total_price,
            status,
            created_at,
            advanced_settings,
            treatment_templates(name, session_count, session_price)
        `)
        .eq("clinic_id", clinicUuid)
        .eq("id", planId.toString())  // Convert to string for compatibility
        .single();

    if (error) {
        console.error("Error fetching patient plan:", error);
        console.error("Attempted to fetch plan ID:", planId, "at clinic:", clinicUuid);
        
        // Check if the error is because the plan doesn't exist
        if (error.code === 'PGRST116' && error.details === 'The result contains 0 rows') {
            console.warn(`Plan with ID ${planId} not found in clinic ${clinicUuid}`);
            return null;
        }
        
        throw error;
    }
    return data;
}

export async function getPatientPlans(patientId) {
    const clinicUuid = await getClinicId();
    if (!clinicUuid) throw new Error("User has no clinic assigned")

    if (shouldUseOfflineMode()) {
        const all = await dataService.get("patient_plans", { clinic_id: clinicUuid, patient_id: patientId.toString() });
        return all.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    const { data, error } = await supabase
        .from("patient_plans")
        .select(`
            id,
            total_sessions,
            completed_sessions,
            total_price,
            status,
            created_at,
            advanced_settings,
            treatment_templates(name, session_count, session_price)
        `)
        .eq("clinic_id", clinicUuid)
        .eq("patient_id", patientId.toString())  // Convert to string for compatibility
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching patient plans:", error);
        console.error("Attempted to fetch plans for patient ID:", patientId, "at clinic:", clinicUuid);
        
        // Check if the error is because there are no plans for this patient
        if (error.code === 'PGRST116' && error.details === 'The result contains 0 rows') {
            console.warn(`No plans found for patient with ID ${patientId} in clinic ${clinicUuid}`);
            return [];
        }
        
        throw error;
    }
    return data;
}

export async function updatePatientPlan(id, payload) {
    const clinicUuid = await getClinicId();
    if (!clinicUuid) throw new Error("User has no clinic assigned")

    if (shouldUseOfflineMode()) {
        return dataService.update("patient_plans", id, payload)
    }

    const { data, error } = await supabase
        .from("patient_plans")
        .update(payload)
        .eq("id", id.toString())  // Convert to string for compatibility
        .eq("clinic_id", clinicUuid)
        .select()
        .single();

    if (error) {
        console.error("Error updating patient plan:", error);
        console.error("Attempted to update plan ID:", id, "at clinic:", clinicUuid);
        throw error;
    }
    return data;
}

export async function deletePatientPlan(id) {
    const clinicUuid = await getClinicId();
    if (!clinicUuid) throw new Error("User has no clinic assigned")

    if (shouldUseOfflineMode()) {
        return dataService.remove("patient_plans", id)
    }

    const { data, error } = await supabase
        .from("patient_plans")
        .delete()
        .eq("id", id.toString())  // Convert to string for compatibility
        .eq("clinic_id", clinicUuid);

    if (error) {
        console.error("Error deleting patient plan:", error);
        console.error("Attempted to delete plan ID:", id, "at clinic:", clinicUuid);
        throw error;
    }
    return data;
}
