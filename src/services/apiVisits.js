import supabase from "./supabase"

export async function getVisitsByPatientId(patientId) {
    // Get current user's clinic_id
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error("Not authenticated")

    const { data: userData } = await supabase
        .from("users")
        .select("clinic_id")
        .eq("user_id", session.user.id)
        .single()

    if (!userData?.clinic_id) throw new Error("User has no clinic assigned")

    const { data, error } = await supabase
        .from("visits")
        .select(`
      id,
      patient_id,
      diagnosis,
      notes,
      medications,
      created_at
    `)
        .eq("clinic_id", userData.clinic_id)
        .eq("patient_id", patientId.toString())  // Convert to string for compatibility
        .order("created_at", { ascending: false })

    if (error) {
        console.error("Error fetching visits by patient ID:", error);
        console.error("Attempted to fetch visits for patient ID:", patientId, "at clinic:", userData.clinic_id);
        
        // Check if the error is because there are no visits for this patient
        if (error.code === 'PGRST116' && error.details === 'The result contains 0 rows') {
            console.warn(`No visits found for patient with ID ${patientId} in clinic ${userData.clinic_id}`);
            return [];
        }
        
        throw error;
    }
    return data ?? []
}

export async function getVisitById(visitId) {
    // Get current user's clinic_id
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error("Not authenticated")

    const { data: userData } = await supabase
        .from("users")
        .select("clinic_id")
        .eq("user_id", session.user.id)
        .single()

    if (!userData?.clinic_id) throw new Error("User has no clinic assigned")

    const { data, error } = await supabase
        .from("visits")
        .select(`
      id,
      patient_id,
      diagnosis,
      notes,
      medications,
      created_at,
      patient:patients(phone, name)
    `)
        .eq("id", visitId.toString())  // Convert to string for compatibility
        .eq("clinic_id", userData.clinic_id)
        .single()

    if (error) {
        console.error("Error fetching visit by ID:", error);
        console.error("Attempted to fetch visit ID:", visitId, "at clinic:", userData.clinic_id);
        throw error;
    }
    return data
}

export async function createVisit(payload) {
    console.log("apiVisits.createVisit: Received payload", payload)
    
    // Get current user's clinic_id
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error("Not authenticated")

    const { data: userData } = await supabase
        .from("users")
        .select("clinic_id")
        .eq("user_id", session.user.id)
        .single()

    if (!userData?.clinic_id) throw new Error("User has no clinic assigned")

    // Add clinic_id to the visit data
    const visitData = {
        ...payload,
        clinic_id: userData.clinic_id
    }

    console.log("apiVisits.createVisit: Final visit data", visitData)

    const { data, error } = await supabase
        .from("visits")
        .insert(visitData)
        .select()
        .single()

    if (error) {
        console.error("apiVisits.createVisit: Error inserting visit", error)
        throw error
    }
    
    console.log("apiVisits.createVisit: Visit inserted successfully", data)
    return data
}

export async function updateVisit(id, payload) {
    // Get current user's clinic_id for security
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error("Not authenticated")

    const { data: userData } = await supabase
        .from("users")
        .select("clinic_id")
        .eq("user_id", session.user.id)
        .single()

    if (!userData?.clinic_id) throw new Error("User has no clinic assigned")

    const { data, error } = await supabase
        .from("visits")
        .update(payload)
        .eq("id", id.toString())  // Convert to string for compatibility
        .eq("clinic_id", userData.clinic_id)
        .select()
        .single()

    if (error) {
        console.error("Error updating visit:", error);
        console.error("Attempted to update visit ID:", id, "at clinic:", userData.clinic_id);
        throw error;
    }
    return data
}

export async function deleteVisit(id) {
    // Get current user's clinic_id for security
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error("Not authenticated")

    const { data: userData } = await supabase
        .from("users")
        .select("clinic_id")
        .eq("user_id", session.user.id)
        .single()

    if (!userData?.clinic_id) throw new Error("User has no clinic assigned")

    const { error } = await supabase
        .from("visits")
        .delete()
        .eq("id", id.toString())  // Convert to string for compatibility
        .eq("clinic_id", userData.clinic_id)

    if (error) {
        console.error("Error deleting visit:", error);
        console.error("Attempted to delete visit ID:", id, "at clinic:", userData.clinic_id);
        throw error;
    }
}