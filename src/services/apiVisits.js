import supabase from "./supabase"

export async function getExaminationsStats() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return { total: 0, today: 0, week: 0, month: 0 }

    const { data: userData } = await supabase.from("users").select("clinic_id").eq("user_id", session.user.id).single()
    if (!userData?.clinic_id) return { total: 0, today: 0, week: 0, month: 0 }

    const now = new Date()
    const today = new Date(now.setHours(0, 0, 0, 0)).toISOString()
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const totalQuery = supabase.from("visits").select("*", { count: "exact", head: true }).eq("clinic_id", userData.clinic_id)
    const todayQuery = supabase.from("visits").select("*", { count: "exact", head: true }).eq("clinic_id", userData.clinic_id).gte("created_at", today)
    const weekQuery = supabase.from("visits").select("*", { count: "exact", head: true }).eq("clinic_id", userData.clinic_id).gte("created_at", weekStart)
    const monthQuery = supabase.from("visits").select("*", { count: "exact", head: true }).eq("clinic_id", userData.clinic_id).gte("created_at", monthStart)

    const [totalRes, todayRes, weekRes, monthRes] = await Promise.all([totalQuery, todayQuery, weekQuery, monthQuery])

    return {
        total: totalRes.count || 0,
        today: todayRes.count || 0,
        week: weekRes.count || 0,
        month: monthRes.count || 0
    }
}

export async function getVisits(search, page, pageSize, filters = {}) {
    // Get current user's clinic_id
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error("Not authenticated")

    const { data: userData } = await supabase
        .from("users")
        .select("clinic_id")
        .eq("user_id", session.user.id)
        .single()

    if (!userData?.clinic_id) throw new Error("User has no clinic assigned")

    const from = Math.max(0, (page - 1) * pageSize)
    const to = from + pageSize - 1

    let query = supabase
        .from("visits")
        .select(`
      id,
      patient_id,
      diagnosis,
      treatment,
      follow_up,
      notes,
      medications,
      custom_fields,
      created_at,
      patient:patients!inner(id, name, phone, gender)
    `, { count: "exact" })
        .eq("clinic_id", userData.clinic_id)
        .order("created_at", { ascending: false })
        .range(from, to)

    if (filters.gender) {
        query = query.eq("patient.gender", filters.gender)
    }

    if (filters.createdAfter) {
        query = query.gte("created_at", filters.createdAfter)
    }

    if (search && search.trim()) {
        const trimmed = search.trim()
        query = query.or(`name.ilike.%${trimmed}%,phone.ilike.%${trimmed}%`, { foreignTable: 'patient' })
    }

    const { data, error, count } = await query
    if (error) {
        console.error("Error fetching visits:", error);
        throw error;
    }
    return { items: data ?? [], total: count ?? 0 }
}

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
      treatment,
      follow_up,
      notes,
      medications,
      custom_fields,
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
      treatment,
      follow_up,
      notes,
      medications,
      custom_fields,
      created_at,
      patient:patients(phone, name, date_of_birth, age, age_unit, gender, medical_history, insurance_info)
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

export async function getVisitStats(startDate) {
    try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return { totalCount: 0, maleCount: 0, femaleCount: 0 }

        const { data: userData } = await supabase
            .from("users")
            .select("clinic_id")
            .eq("user_id", session.user.id)
            .single()

        if (!userData?.clinic_id) return { totalCount: 0, maleCount: 0, femaleCount: 0 }

        // Queries
        let totalQuery = supabase
            .from("visits")
            .select("*", { count: "exact", head: true })
            .eq("clinic_id", userData.clinic_id)

        // For gender stats, we need to join with patients
        // Note: This assumes foreign key is set up correctly as 'patient_id' -> 'patients.id'
        let maleQuery = supabase
            .from("visits")
            .select("*, patients!inner(gender)", { count: "exact", head: true })
            .eq("clinic_id", userData.clinic_id)
            .eq("patients.gender", "male")

        let femaleQuery = supabase
            .from("visits")
            .select("*, patients!inner(gender)", { count: "exact", head: true })
            .eq("clinic_id", userData.clinic_id)
            .eq("patients.gender", "female")

        if (startDate) {
            totalQuery = totalQuery.gte("created_at", startDate)
            maleQuery = maleQuery.gte("created_at", startDate)
            femaleQuery = femaleQuery.gte("created_at", startDate)
        }

        const [totalRes, maleRes, femaleRes] = await Promise.all([
            totalQuery,
            maleQuery,
            femaleQuery
        ])

        return {
            totalCount: totalRes.count || 0,
            maleCount: maleRes.count || 0,
            femaleCount: femaleRes.count || 0
        }
    } catch (error) {
        console.error("Error fetching visit stats:", error)
        return { totalCount: 0, maleCount: 0, femaleCount: 0 }
    }
}
