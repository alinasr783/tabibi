import supabase from "./supabase"

export async function getDashboardStats() {
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

    // Get total patients count
    const { count: totalPatients, error: patientsError } = await supabase
        .from("patients")
        .select("*", { count: "exact", head: true })
        .eq("clinic_id", clinicId)

    if (patientsError) throw patientsError

    // Get all appointments and filter manually for better reliability
    const { data: allAppointments, error: allAppointmentsError } = await supabase
        .from("appointments")
        .select("*")
        .eq("clinic_id", clinicId)

    if (allAppointmentsError) throw allAppointmentsError

    // Count today's appointments
    const today = new Date().toISOString().split('T')[0]
    const todayAppointments = allAppointments?.filter(appointment => {
        if (!appointment.date) return false
        const appointmentDate = new Date(appointment.date).toISOString().split('T')[0]
        return appointmentDate === today
    }).length || 0

    // Count pending appointments
    const pendingAppointments = allAppointments?.filter(
        appointment => appointment.status === 'pending'
    ).length || 0

    // Get total income from completed appointments (similar to finance page approach)
    const { data: completedAppointments, error: completedAppointmentsError } = await supabase
        .from("appointments")
        .select("price")
        .eq("clinic_id", clinicId)
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

    // Get all appointments and filter manually for better reliability
    const { data: allAppointments, error: allAppointmentsError } = await supabase
        .from("appointments")
        .select("*")
        .eq("clinic_id", clinicId)

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

    // Filter appointments within date range
    const filteredAppointments = allAppointments?.filter(appointment => {
        if (!appointment.date) return false
        const appointmentDate = new Date(appointment.date)
        return appointmentDate >= startDate && appointmentDate <= today
    }) || []

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

    // Get today's date range in the local timezone converted to UTC for DB query
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

    // Get all appointments with patient info for today
    const { data: appointments, error } = await supabase
        .from("appointments")
        .select(`
            id,
            date,
            status,
            patient:patients(name)
        `)
        .eq("clinic_id", clinicId)
        .gte("date", startOfDay.toISOString())
        .lte("date", endOfDay.toISOString())
        .order("date", { ascending: true })
        .limit(5)

    if (error) throw error

    return appointments || []
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