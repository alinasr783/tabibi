import supabase from "./supabase"
import { getAllowedClinicIdsForPermission, getAllMyClinicIds } from "./clinicAccess"

export async function getDashboardStats() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error("Not authenticated")

    // Get ALL clinic IDs that user owns or is member of (for multi-branch support)
    let clinicIds = []
    try {
        clinicIds = await getAllMyClinicIds()
    } catch (e) {
        console.warn("Could not get all clinics, falling back to user clinic", e)
        const { data: userData } = await supabase
            .from("users")
            .select("clinic_id")
            .eq("user_id", session.user.id)
            .single()
        if (userData?.clinic_id) {
            clinicIds = [userData.clinic_id]
        }
    }

    console.log("getDashboardStats - All clinic IDs:", clinicIds)

    if (clinicIds.length === 0) throw new Error("User has no clinic assigned")

    // Get total patients count across all clinics
    const { count: totalPatients, error: patientsError } = await supabase
        .from("patients")
        .select("*", { count: "exact", head: true })
        .in("clinic_id", clinicIds)

    console.log("getDashboardStats - Total patients:", totalPatients, patientsError)

    if (patientsError) throw patientsError

    // Get all appointments across all clinics
    const { data: allAppointments, error: allAppointmentsError } = await supabase
        .from("appointments")
        .select("*")
        .in("clinic_id", clinicIds)

    console.log("getDashboardStats - Total appointments fetched:", allAppointments?.length || 0, allAppointmentsError)

    if (allAppointmentsError) throw allAppointmentsError

    // Count today's appointments using local date
    const todayLocal = new Date()
    const todayYear = todayLocal.getFullYear()
    const todayMonth = String(todayLocal.getMonth() + 1).padStart(2, '0')
    const todayDay = String(todayLocal.getDate()).padStart(2, '0')
    const todayStr = `${todayYear}-${todayMonth}-${todayDay}`
    
    console.log("getDashboardStats - Today's date (local):", todayStr)
    
    const todayAppointments = allAppointments?.filter(appointment => {
        if (!appointment.date) return false
        // Extract date part - handle both ISO strings and plain date strings
        const appointmentDateStr = appointment.date.toString().split('T')[0]
        return appointmentDateStr === todayStr
    }).length || 0
    
    console.log("getDashboardStats - Today's appointments:", todayAppointments)

    // Count pending appointments
    const pendingAppointments = allAppointments?.filter(
        appointment => appointment.status === 'pending'
    ).length || 0

    // Get total income from completed appointments across all clinics
    const { data: completedAppointments, error: completedAppointmentsError } = await supabase
        .from("appointments")
        .select("price")
        .in("clinic_id", clinicIds)
        .eq("status", "completed")

    if (completedAppointmentsError) throw completedAppointmentsError

    // Calculate total revenue from completed appointments
    const incomeValue = completedAppointments.reduce((sum, appointment) => sum + (parseFloat(appointment.price) || 0), 0)

    return {
        totalPatients: totalPatients || 0,
        todayAppointments: todayAppointments || 0,
        pendingAppointments: pendingAppointments || 0,
        totalIncome: incomeValue || 0
    }
}

export async function getFilteredPatientStats(filter) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error("Not authenticated")

    // Get ALL clinic IDs that user owns or is member of (for multi-branch support)
    let clinicIds = []
    try {
        clinicIds = await getAllMyClinicIds()
    } catch (e) {
        console.warn("Could not get all clinics, falling back to user clinic", e)
        const { data: userData } = await supabase
            .from("users")
            .select("clinic_id")
            .eq("user_id", session.user.id)
            .single()
        if (userData?.clinic_id) {
            clinicIds = [userData.clinic_id]
        }
    }

    console.log("getFilteredPatientStats - All clinic IDs:", clinicIds)

    if (clinicIds.length === 0) throw new Error("User has no clinic assigned")

    // Get all appointments across all clinics
    const { data: allAppointments, error: allAppointmentsError } = await supabase
        .from("appointments")
        .select("*")
        .in("clinic_id", clinicIds)

    if (allAppointmentsError) throw allAppointmentsError

    // Calculate date range based on filter
    const today = new Date()
    let startDate

    switch (filter) {
        case "week":
            startDate = new Date(today)
            startDate.setDate(startDate.getDate() - 7)
            break
        case "month":
            startDate = new Date(today)
            startDate.setMonth(startDate.getMonth() - 1)
            break
        case "threeMonths":
            startDate = new Date(today)
            startDate.setMonth(startDate.getMonth() - 3)
            break
        default:
            startDate = new Date(today)
            startDate.setMonth(startDate.getMonth() - 1)
    }

    // Filter appointments within date range using string comparison
    const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    
    console.log("getFilteredPatientStats - Date range:", startDateStr, "to", todayStr)
    
    const filteredAppointments = allAppointments?.filter(appointment => {
        if (!appointment.date) return false
        // Extract date string directly without Date conversion
        const appointmentDateStr = appointment.date.toString().split('T')[0]
        return appointmentDateStr >= startDateStr && appointmentDateStr <= todayStr
    }) || []
    
    console.log("getFilteredPatientStats - Filtered appointments:", filteredAppointments.length)

    // Count unique patients
    const uniquePatients = new Set(filteredAppointments.map(app => app.patient_id))
    const filteredPatientsCount = uniquePatients.size

    // Count pending appointments in the filtered period
    const filteredPendingAppointments = filteredAppointments.filter(
        appointment => appointment.status === 'pending'
    ).length

    // Count online appointments in the filtered period (from === 'booking')
    const filteredOnlineAppointments = filteredAppointments.filter(
        appointment => appointment.from === 'booking'
    ).length

    // Calculate total income from completed appointments in the filtered period
    const filteredTotalIncome = filteredAppointments
        .filter(appointment => appointment.status === 'completed')
        .reduce((sum, appointment) => sum + (parseFloat(appointment.price) || 0), 0)

    return {
        filteredPatients: filteredPatientsCount,
        filteredPendingAppointments,
        filteredOnlineAppointments,
        filteredTotalIncome
    }
}

export async function getTodayAppointments() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error("Not authenticated")

    // Get all allowed clinic IDs (for multi-branch support)
    let clinicIds = []
    try {
        clinicIds = await getAllMyClinicIds()
    } catch (e) {
        console.warn("Could not get all clinics, falling back to user clinic", e)
        const { data: userData } = await supabase
            .from("users")
            .select("clinic_id")
            .eq("user_id", session.user.id)
            .single()
        if (userData?.clinic_id) {
            clinicIds = [userData.clinic_id]
        }
    }

    console.log("getTodayAppointments - All clinic IDs:", clinicIds)

    if (clinicIds.length === 0) throw new Error("User has no clinic assigned")

    // Get today's date in local YYYY-MM-DD format
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const localToday = `${year}-${month}-${day}`

    // Get all appointments with patient info for today across all clinics
    // Use like to match date strings since stored dates might have time component
    const { data: appointments, error } = await supabase
        .from("appointments")
        .select(`
            id,
            date,
            status,
            patient:patients(name)
        `)
        .in("clinic_id", clinicIds)
        .like("date", localToday + "%")
        .order("date", { ascending: true })
        .limit(10)

    if (error) throw error

    return appointments || []
}

export async function getAppointmentsStatsForLast7Days() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error("Not authenticated")

    // Get ALL clinic IDs that user owns or is member of (for multi-branch support)
    let clinicIds = []
    try {
        clinicIds = await getAllMyClinicIds()
    } catch (e) {
        console.warn("Could not get all clinics, falling back to user clinic", e)
        const { data: userData } = await supabase
            .from("users")
            .select("clinic_id")
            .eq("user_id", session.user.id)
            .single()
        if (userData?.clinic_id) {
            clinicIds = [userData.clinic_id]
        }
    }

    console.log("getAppointmentsStatsForLast7Days - All clinic IDs:", clinicIds)

    if (clinicIds.length === 0) throw new Error("User has no clinic assigned")

    // Get current local date and the date 6 days ago
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 6)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    // Format boundaries for DB query (local ISO-like strings)
    const startStr = sevenDaysAgo.toISOString().split('T')[0]
    const endStr = today.toISOString().split('T')[0]

    console.log("getAppointmentsStatsForLast7Days - Date range:", startStr, "to", endStr)

    // Get appointments in this range across all clinics
    // Use like filter for date strings since stored dates might have time component
    const { data, error } = await supabase
        .from("appointments")
        .select("date")
        .in("clinic_id", clinicIds)
        .gte("date", startStr)
        .lte("date", endStr + "T23:59:59")

    if (error) throw error

    // Initialize counts for each of the last 7 days using local time labels
    const stats = []
    for (let i = 0; i < 7; i++) {
        const d = new Date(sevenDaysAgo)
        d.setDate(sevenDaysAgo.getDate() + i)
        
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        const dateKey = `${y}-${m}-${day}`
        
        const label = d.toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric' })
        stats.push({ date: dateKey, label, count: 0 })
    }

    // Aggregate data using local date extraction
    if (data) {
        data.forEach(appointment => {
            if (!appointment.date) return
            
            // Convert DB date (UTC string) to local Date object to get the local day
            const apptDate = new Date(appointment.date)
            const y = apptDate.getFullYear()
            const m = String(apptDate.getMonth() + 1).padStart(2, '0')
            const d = String(apptDate.getDate()).padStart(2, '0')
            const localKey = `${y}-${m}-${d}`
            
            const dayStat = stats.find(s => s.date === localKey)
            if (dayStat) dayStat.count++
        })
    }

    return stats
}

export async function getRecentActivity(page = 1, pageSize = 5) {
    // Get current user's clinic_id
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error("Not authenticated")

    const { data: userData } = await supabase
        .from("users")
        .select("clinic_id")
        .eq("user_id", session.user.id)
        .single()

    if (!userData?.clinic_id) throw new Error("User has no clinic assigned")

    const clinicId = userData.clinic_id

    // Calculate range for pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // First get the total count
    const { count: totalCount, error: countError } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("clinic_id", clinicId)

    if (countError) throw countError

    // Get recent appointments with patient info
    const { data: recentAppointments, error } = await supabase
        .from("appointments")
        .select(`
            id,
            date,
            notes,
            status,
            patient:patients(name)
        `)
        .eq("clinic_id", clinicId)
        .order("date", { ascending: false })
        .range(from, to)

    if (error) throw error

    // Transform data for activity feed
    const transformedData = recentAppointments.map(appointment => ({
        id: appointment.id,
        title: `حجز معاد - ${appointment.patient?.name || 'مريض'}`,
        time: new Date(appointment.date).toLocaleDateString('ar-EG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }),
        tag: appointment.status === 'pending' ? 'جديد' : null,
        type: 'appointment',
        appointmentId: appointment.id
    }))

    return {
        data: transformedData,
        count: totalCount
    }
}