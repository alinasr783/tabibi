import supabase from "./supabase"
import { getAllItems, getItem, STORE_NAMES } from "../features/offline-mode/offlineDB"
import { create as dsCreate } from "./dataService"
import { resolveClinicIdBigint } from "./clinicIds"

export async function createFinancialRecord(payload) {
    const offlineEnabled = (() => {
        try { return localStorage.getItem("tabibi_offline_enabled") === "true" } catch { return false }
    })()
    const browserOffline = typeof navigator !== "undefined" && navigator.onLine === false
    if (offlineEnabled && browserOffline) {
        const clinicIdBigint = payload?.clinic_id || await resolveClinicIdBigint().catch(() => null)
        const record = {
            ...payload,
            clinic_id: clinicIdBigint,
            updated_at: new Date().toISOString()
        }
        return dsCreate("financial_records", record)
    }

    // Get current user's clinic_id (bigint for financial_records table)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error("Not authenticated")

    const { data: userData } = await supabase
        .from("users")
        .select("clinic_id_bigint, clinic_id")
        .eq("user_id", session.user.id)
        .single()

    // Use clinic_id_bigint for financial_records table (legacy schema uses bigint)
    // If clinic_id_bigint is not set, try to get it from clinics table
    let clinicIdBigint = userData?.clinic_id_bigint
    
    if (!clinicIdBigint && userData?.clinic_id) {
        const { data: clinicData } = await supabase
            .from("clinics")
            .select("clinic_id_bigint, id")
            .eq("clinic_uuid", userData.clinic_id)
            .single()
        
        clinicIdBigint = clinicData?.clinic_id_bigint || clinicData?.id
    }

    if (!clinicIdBigint) throw new Error("User has no clinic assigned")

    // Add clinic_id (as bigint) to the financial record data
    const financialRecordData = {
        ...payload,
        clinic_id: clinicIdBigint
    }

    const { data, error } = await supabase
        .from("financial_records")
        .insert(financialRecordData)
        .select()
        .single()

    if (error) throw error
    return data
}

export async function getFinancialRecords(page = 1, pageSize = 10, filters = {}) {
    const offlineEnabled = (() => {
        try { return localStorage.getItem("tabibi_offline_enabled") === "true" } catch { return false }
    })()
    const browserOffline = typeof navigator !== "undefined" && navigator.onLine === false
    if (offlineEnabled && browserOffline) {
        const clinicIdBigint = await resolveClinicIdBigint().catch(() => null)
        let items = await getAllItems(STORE_NAMES.FINANCIAL_RECORDS)
        if (clinicIdBigint != null) items = items.filter((r) => String(r?.clinic_id || "") === String(clinicIdBigint))

        if (filters.startDate && filters.endDate) {
            items = items.filter((r) => String(r?.recorded_at || r?.created_at || "") >= String(filters.startDate) && String(r?.recorded_at || r?.created_at || "") <= String(filters.endDate))
        }
        if (filters.type) items = items.filter((r) => String(r?.type || "") === String(filters.type))

        const attachPatient = async (r) => {
            const pid = r?.patient_id
            if (pid == null) return { ...r, patient: null }
            const p = await getItem(STORE_NAMES.PATIENTS, pid)
            return { ...r, patient: p ? { name: p.name } : null }
        }
        items = await Promise.all(items.map(attachPatient))

        items.sort((a, b) => String(b?.recorded_at || b?.created_at || "").localeCompare(String(a?.recorded_at || a?.created_at || "")))
        const from = Math.max(0, (page - 1) * pageSize)
        const to = from + pageSize
        return { items: items.slice(from, to), total: items.length }
    }

    // Get current user's clinic_id (bigint)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error("Not authenticated")

    const { data: userData } = await supabase
        .from("users")
        .select("clinic_id_bigint, clinic_id")
        .eq("user_id", session.user.id)
        .single()

    // Use clinic_id_bigint for financial_records table
    let clinicIdBigint = userData?.clinic_id_bigint
    
    if (!clinicIdBigint && userData?.clinic_id) {
        const { data: clinicData } = await supabase
            .from("clinics")
            .select("clinic_id_bigint, id")
            .eq("clinic_uuid", userData.clinic_id)
            .single()
        
        clinicIdBigint = clinicData?.clinic_id_bigint || clinicData?.id
    }

    if (!clinicIdBigint) throw new Error("User has no clinic assigned")

    const from = Math.max(0, (page - 1) * pageSize)
    const to = from + pageSize - 1

    let query = supabase
        .from("financial_records")
        .select(`
      id,
      appointment_id,
      patient_plan_id,
      patient_id,
      amount,
      type,
      description,
      recorded_at,
      created_at,
      patient:patients(name)
    `, { count: "exact" })
        .eq("clinic_id", clinicIdBigint)
        .order("recorded_at", { ascending: false })

    // Apply date filter if provided
    if (filters.startDate && filters.endDate) {
        query = query
            .gte('recorded_at', filters.startDate)
            .lte('recorded_at', filters.endDate)
    }

    // Apply type filter if provided
    if (filters.type) {
        query = query.eq('type', filters.type)
    }

    // Apply range for pagination
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) throw error
    return { items: data ?? [], total: count ?? 0 }
}

export async function getFinancialSummary(filters = {}) {
    // Get current user's clinic_id (bigint)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error("Not authenticated")

    const { data: userData } = await supabase
        .from("users")
        .select("clinic_id_bigint, clinic_id")
        .eq("user_id", session.user.id)
        .single()

    // Use clinic_id_bigint for financial_records table
    let clinicIdBigint = userData?.clinic_id_bigint
    
    if (!clinicIdBigint && userData?.clinic_id) {
        const { data: clinicData } = await supabase
            .from("clinics")
            .select("clinic_id_bigint, id")
            .eq("clinic_uuid", userData.clinic_id)
            .single()
        
        clinicIdBigint = clinicData?.clinic_id_bigint || clinicData?.id
    }

    if (!clinicIdBigint) throw new Error("User has no clinic assigned")

    // Get all records for calculation
    let query = supabase
        .from("financial_records")
        .select("amount, type")
        .eq("clinic_id", clinicIdBigint)

    // Apply date filter if provided
    if (filters.startDate && filters.endDate) {
        query = query
            .gte('recorded_at', filters.startDate)
            .lte('recorded_at', filters.endDate)
    }

    const { data, error } = await query
    if (error) throw error

    const totalIncome = data
        .filter(r => r.type === 'income')
        .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)

    const totalExpense = data
        .filter(r => r.type === 'expense')
        .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)

    const totalCharges = data
        .filter(r => r.type === 'charge')
        .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)

    return {
        totalIncome,
        totalExpense,
        totalCharges,
        netProfit: totalIncome - totalExpense
    }
}

export async function getFinancialChartData(filters = {}) {
    // Get current user's clinic_id (bigint)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error("Not authenticated")

    const { data: userData } = await supabase
        .from("users")
        .select("clinic_id_bigint, clinic_id")
        .eq("user_id", session.user.id)
        .single()

    // Use clinic_id_bigint for financial_records table
    let clinicIdBigint = userData?.clinic_id_bigint
    
    if (!clinicIdBigint && userData?.clinic_id) {
        const { data: clinicData } = await supabase
            .from("clinics")
            .select("clinic_id_bigint, id")
            .eq("clinic_uuid", userData.clinic_id)
            .single()
        
        clinicIdBigint = clinicData?.clinic_id_bigint || clinicData?.id
    }

    if (!clinicIdBigint) throw new Error("User has no clinic assigned")

    // Get all records for charts
    let query = supabase
        .from("financial_records")
        .select("amount, type, recorded_at, description")
        .eq("clinic_id", clinicIdBigint)
        .order("recorded_at", { ascending: true })

    // Apply date filter if provided
    if (filters.startDate && filters.endDate) {
        query = query
            .gte('recorded_at', filters.startDate)
            .lte('recorded_at', filters.endDate)
    }

    const { data, error } = await query
    if (error) throw error

    return data ?? []
}
