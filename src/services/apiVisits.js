import supabase from "./supabase"
import * as dataService from "./dataService"
import { shouldUseOfflineMode, getClinicId } from "./apiOfflineMode"

export async function getExaminationsStats() {
    const clinicUuid = await getClinicId();
    if (!clinicUuid) return { total: 0, today: 0, week: 0, month: 0 }

    if (shouldUseOfflineMode()) {
        const all = await dataService.get("visits", { clinic_id: clinicUuid });
        const now = new Date();
        const today = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

        return {
            total: all.length,
            today: all.filter(v => v.created_at >= today).length,
            week: all.filter(v => v.created_at >= weekStart).length,
            month: all.filter(v => v.created_at >= monthStart).length
        };
    }

    const now = new Date()
    const today = new Date(now.setHours(0, 0, 0, 0)).toISOString()
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const totalQuery = supabase.from("visits").select("*", { count: "exact", head: true }).eq("clinic_id", clinicUuid)
    const todayQuery = supabase.from("visits").select("*", { count: "exact", head: true }).eq("clinic_id", clinicUuid).gte("created_at", today)
    const weekQuery = supabase.from("visits").select("*", { count: "exact", head: true }).eq("clinic_id", clinicUuid).gte("created_at", weekStart)
    const monthQuery = supabase.from("visits").select("*", { count: "exact", head: true }).eq("clinic_id", clinicUuid).gte("created_at", monthStart)

    const [totalRes, todayRes, weekRes, monthRes] = await Promise.all([totalQuery, todayQuery, weekQuery, monthQuery])

    return {
        total: totalRes.count || 0,
        today: todayRes.count || 0,
        week: weekRes.count || 0,
        month: monthRes.count || 0
    }
}

export async function getVisits(filters = {}) {
  return dataService.get("visits", filters)
}

export async function getVisitsByPatientId(patientId) {
    const clinicUuid = await getClinicId();
    if (!clinicUuid) throw new Error("User has no clinic assigned")

    if (shouldUseOfflineMode()) {
        const all = await dataService.get("visits", { clinic_id: clinicUuid, patient_id: patientId.toString() });
        return all.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

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
        .eq("clinic_id", clinicUuid)
        .eq("patient_id", patientId.toString())  // Convert to string for compatibility
        .order("created_at", { ascending: false })

    if (error) {
        console.error("Error fetching visits by patient ID:", error);
        console.error("Attempted to fetch visits for patient ID:", patientId, "at clinic:", clinicUuid);
        
        // Check if the error is because there are no visits for this patient
        if (error.code === 'PGRST116' && error.details === 'The result contains 0 rows') {
            console.warn(`No visits found for patient with ID ${patientId} in clinic ${clinicUuid}`);
            return [];
        }
        
        throw error;
    }
    return data ?? []
}

export async function getVisitById(id) {
  const useOffline = shouldUseOfflineMode()
  if (useOffline) {
    const visits = await dataService.get("visits", { id })
    return visits[0] || null
  }

  const { data, error } = await supabase.from("visits").select("*, patient:patients(*)").eq("id", id).single()
  if (error) throw error
  return data
}

export async function createVisit(payload) {
  // Try to get clinic_id from payload first, then cache, then session
  let clinicId = payload.clinic_id
  
  if (!clinicId) {
    clinicId = localStorage.getItem("tabibi_clinic_id")
  }

  if (!clinicId && !shouldUseOfflineMode()) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const { data: userData } = await supabase.from("users").select("clinic_id").eq("user_id", session.user.id).single()
      clinicId = userData?.clinic_id
    }
  }

  return dataService.create("visits", { ...payload, clinic_id: clinicId })
}

export async function updateVisit(id, payload) {
  return dataService.update("visits", id, payload)
}

export async function deleteVisit(id) {
  return dataService.remove("visits", id)
}

export async function getVisitStats(startDate) {
    try {
        const clinicUuid = await getClinicId();
        if (!clinicUuid) return { totalCount: 0, maleCount: 0, femaleCount: 0 }

        if (shouldUseOfflineMode()) {
          const all = await dataService.get("visits", { clinic_id: clinicUuid });
          const patients = await dataService.get("patients", { clinic_id: clinicUuid });
          
          let filtered = all;
          if (startDate) {
            filtered = all.filter(v => v.created_at >= startDate);
          }

          const malePatientIds = new Set(patients.filter(p => p.gender === "male").map(p => p.id.toString()));
          const femalePatientIds = new Set(patients.filter(p => p.gender === "female").map(p => p.id.toString()));

          return {
            totalCount: filtered.length,
            maleCount: filtered.filter(v => malePatientIds.has(v.patient_id?.toString())).length,
            femaleCount: filtered.filter(v => femalePatientIds.has(v.patient_id?.toString())).length
          };
        }

        // Queries
        let totalQuery = supabase
            .from("visits")
            .select("*", { count: "exact", head: true })
            .eq("clinic_id", clinicUuid)

        // For gender stats, we need to join with patients
        // Note: This assumes foreign key is set up correctly as 'patient_id' -> 'patients.id'
        let maleQuery = supabase
            .from("visits")
            .select("*, patients!inner(gender)", { count: "exact", head: true })
            .eq("clinic_id", clinicUuid)
            .eq("patients.gender", "male")

        let femaleQuery = supabase
            .from("visits")
            .select("*, patients!inner(gender)", { count: "exact", head: true })
            .eq("clinic_id", clinicUuid)
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
