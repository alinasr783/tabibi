import supabase from "./supabase";

export async function createPatientPlan(payload) {
    // Get current user's clinic_id
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const { data: userData } = await supabase
        .from("users")
        .select("clinic_id")
        .eq("user_id", session.user.id)
        .single();

    if (!userData?.clinic_id) throw new Error("User has no clinic assigned");

    // Add clinic_id to the patient plan data
    const patientPlanData = {
        ...payload,
        clinic_id: userData.clinic_id
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
    // Get current user's clinic_id
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const { data: userData } = await supabase
        .from("users")
        .select("clinic_id")
        .eq("user_id", session.user.id)
        .single();

    if (!userData?.clinic_id) throw new Error("User has no clinic assigned");

    const { data, error } = await supabase
        .from("patient_plans")
        .select(`
            id,
            total_sessions,
            completed_sessions,
            total_price,
            status,
            created_at,
            treatment_templates(name, session_count, session_price)
        `)
        .eq("clinic_id", userData.clinic_id)
        .eq("id", planId.toString())  // Convert to string for compatibility
        .single();

    if (error) {
        console.error("Error fetching patient plan:", error);
        console.error("Attempted to fetch plan ID:", planId, "at clinic:", userData.clinic_id);
        
        // Check if the error is because the plan doesn't exist
        if (error.code === 'PGRST116' && error.details === 'The result contains 0 rows') {
            console.warn(`Plan with ID ${planId} not found in clinic ${userData.clinic_id}`);
            return null;
        }
        
        throw error;
    }
    return data;
}

export async function getPatientPlans(patientId) {
    // Get current user's clinic_id
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const { data: userData } = await supabase
        .from("users")
        .select("clinic_id")
        .eq("user_id", session.user.id)
        .single();

    if (!userData?.clinic_id) throw new Error("User has no clinic assigned");

    const { data, error } = await supabase
        .from("patient_plans")
        .select(`
            id,
            total_sessions,
            completed_sessions,
            total_price,
            status,
            created_at,
            treatment_templates(name, session_count, session_price)
        `)
        .eq("clinic_id", userData.clinic_id)
        .eq("patient_id", patientId.toString())  // Convert to string for compatibility
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching patient plans:", error);
        console.error("Attempted to fetch plans for patient ID:", patientId, "at clinic:", userData.clinic_id);
        
        // Check if the error is because there are no plans for this patient
        if (error.code === 'PGRST116' && error.details === 'The result contains 0 rows') {
            console.warn(`No plans found for patient with ID ${patientId} in clinic ${userData.clinic_id}`);
            return [];
        }
        
        throw error;
    }
    return data;
}

export async function updatePatientPlan(id, payload) {
    // Get current user's clinic_id
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const { data: userData } = await supabase
        .from("users")
        .select("clinic_id")
        .eq("user_id", session.user.id)
        .single();

    if (!userData?.clinic_id) throw new Error("User has no clinic assigned");

    const { data, error } = await supabase
        .from("patient_plans")
        .update(payload)
        .eq("id", id.toString())  // Convert to string for compatibility
        .eq("clinic_id", userData.clinic_id)
        .select()
        .single();

    if (error) {
        console.error("Error updating patient plan:", error);
        console.error("Attempted to update plan ID:", id, "at clinic:", userData.clinic_id);
        throw error;
    }
    return data;
}

export async function deletePatientPlan(id) {
    // Get current user's clinic_id
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const { data: userData } = await supabase
        .from("users")
        .select("clinic_id")
        .eq("user_id", session.user.id)
        .single();

    if (!userData?.clinic_id) throw new Error("User has no clinic assigned");

    const { data, error } = await supabase
        .from("patient_plans")
        .delete()
        .eq("id", id.toString())  // Convert to string for compatibility
        .eq("clinic_id", userData.clinic_id);

    if (error) {
        console.error("Error deleting patient plan:", error);
        console.error("Attempted to delete plan ID:", id, "at clinic:", userData.clinic_id);
        throw error;
    }
    return data;
}