import supabase from "./supabase"
import { createPublicNotification } from "./apiNotifications"
import { addToGoogleCalendar } from "./integrationService"

export async function getAppointments(search, page, pageSize, filters = {}) {
    // Get current user's clinic_id
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error("Not authenticated")

    const { data: userData } = await supabase
        .from("users")
        .select("clinic_id")
        .eq("user_id", session.user.id)
        .single()

    if (!userData?.clinic_id) {
        console.error("Could not find clinic_id for user. Check RLS policies on 'users' table.")
        console.log("Debug getAppointments: session user id:", session.user.id)
        throw new Error("User has no clinic assigned")
    }

    console.log("getAppointments/start", {
        userId: session.user.id,
        clinicId: userData.clinic_id,
        search,
        page,
        pageSize,
        filters
    })

    const from = Math.max(0, (page - 1) * pageSize)
    const to = from + pageSize - 1

    // Detect if search is appointment ID (UUID or strict ID)
    const isIdSearch = !!search && /^(?:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|\d+)$/.test(search.trim())

    // Determine if we need inner join for patient search only
    const patientRelation = (!search || isIdSearch) 
        ? 'patient:patients(id, name, phone)' 
        : 'patient:patients!inner(id, name, phone)'
    console.log("getAppointments/patientRelation", patientRelation)

    let query = supabase
        .from("appointments")
        .select(`
      id,
      date,
      notes,
      price,
      status,
      from,
      age,
      ${patientRelation},
      created_at
    `, { count: "exact" })
        .eq("clinic_id", userData.clinic_id)

    // Apply time filter
    if (filters.time === "upcoming") {
        // Use YYYY-MM-DD format to ensure we include today's appointments
        // Comparing date column (if it's just date) with ISO string (with time) would exclude today
        const today = new Date().toLocaleDateString('en-CA')
        query = query.gte('date', today)

        query = query.order("status", { ascending: false })
            .order("date", { ascending: true })
        console.log("getAppointments/timeFilter", { type: "upcoming", today })
    } else {
        // For all appointments, sort by date descending (newest first)
        // But for online bookings (source: booking), prioritize pending status
        if (filters.source === "booking") {
            // Custom sorting: pending status first, then by created_at (newest first)
            // We'll handle this sorting manually after fetching the data
            query = query.order("created_at", { ascending: false })
            console.log("getAppointments/sourceFilter", { source: "booking" })
        } else {
            query = query.order("date", { ascending: false })
            console.log("getAppointments/sourceFilter", { source: filters.source || "all" })
        }
    }

    // Apply range for pagination
    query = query.range(from, to)
    console.log("getAppointments/pagination", { from, to })

    // Apply date range filter if provided
    if (filters.dateFrom || filters.dateTo) {
        if (filters.dateFrom) {
            const startDate = new Date(filters.dateFrom)
            startDate.setHours(0, 0, 0, 0)
            query = query.gte('date', startDate.toISOString())
            console.log("getAppointments/dateFrom", startDate.toISOString())
        }
        if (filters.dateTo) {
            const endDate = new Date(filters.dateTo)
            endDate.setHours(23, 59, 59, 999)
            query = query.lte('date', endDate.toISOString())
            console.log("getAppointments/dateTo", endDate.toISOString())
        }
    } else if (filters.date) {
        // Single date filter (for backwards compatibility)
        const startDate = new Date(filters.date)
        startDate.setHours(0, 0, 0, 0)
        const endDate = new Date(startDate)
        endDate.setHours(23, 59, 59, 999)

        query = query
            .gte('date', startDate.toISOString())
            .lte('date', endDate.toISOString())
        console.log("getAppointments/date", { start: startDate.toISOString(), end: endDate.toISOString() })
    }

    if (filters.patientId) {
        query = query.eq('patient_id', filters.patientId)
    }

    // Apply status filter if provided (skip if "all")
    if (filters.status && filters.status !== "all") {
        query = query.eq('status', filters.status)
        console.log("getAppointments/statusFilter", filters.status)
    }

    // Apply source filter if provided (skip if "all")
    if (filters.source && filters.source !== "all") {
        query = query.eq('from', filters.source)
        console.log("getAppointments/sourceEqFilter", filters.source)
    }
    
    // Apply notes filter if provided
    if (filters.hasNotes) {
        query = query.not('notes', 'is', null)
        query = query.neq('notes', '')
    }

    // Apply search by ID or by patient fields
    if (search) {
        if (isIdSearch) {
            // Exact match on appointment ID within the same clinic
            query = query.eq('id', search.trim())
            console.log("getAppointments/searchById", search)
        } else {
            // Patient name/phone search
            query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`, { foreignTable: 'patients' })
            console.log("getAppointments/search", search)
        }
    }

    const { data, error, count } = await query
    console.log("getAppointments/result", { count, length: (data || []).length })

    if (error) {
        console.error("Error fetching appointments:", error)
        console.log("getAppointments/errorDetails", { code: error.code, message: error.message })
        throw new Error("فشل في تحميل المواعيد")
    }

    // If source=booking, manually sort pending items to top
    let sortedData = data || []
    if (filters.source === "booking") {
        sortedData = sortedData.sort((a, b) => {
            if (a.status === "pending" && b.status !== "pending") return -1
            if (a.status !== "pending" && b.status === "pending") return 1
            return 0
        })
        console.log("getAppointments/sortedForBooking", { length: sortedData.length })
    }

    return {
        data: sortedData,
        count
    }
}

export async function createAppointment(payload) {
    // Get current user's clinic_id
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error("Not authenticated")

    // Get clinic_id (which is a UUID in users table)
    const { data: userData } = await supabase
        .from("users")
        .select("clinic_id")
        .eq("user_id", session.user.id)
        .single()

    if (!userData?.clinic_id) throw new Error("User has no clinic assigned")

    // The clinic_id in users table is the UUID for the clinics table
    const clinicUuid = userData.clinic_id

    /* 
    // Check plan limits - DISABLED by user request
    /*
    const { data: clinicData } = await supabase
        .from("clinics")
        .select("current_plan")
        .eq("clinic_uuid", clinicUuid) // Use clinic_uuid to find the clinic
        .single()

    const currentPlan = clinicData?.current_plan || 'free'
    const { data: planLimits } = await supabase
        .from("plans")
        .select("limits")
        .eq("id", currentPlan)
        .single()

    const maxAppointments = planLimits?.limits?.appointments || 50 // Default for free plan if not found

    // Check usage for CURRENT MONTH
    const now = new Date()
    // Start of current month
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    if (maxAppointments !== -1) {
        // 3. احسب عدد المرضى المضافين في الشهر الحالي فقط
        const { count } = await supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', clinicUuid) // Appointments use clinic_id (UUID)
            .gte('created_at', periodStart) // أهم شرط: أكبر من أو يساوي تاريخ بداية الباقة

        // 4. المقارنة الحاسمة
        if (count >= maxAppointments) {
            throw new Error("لقد تجاوزت الحد المسموح من المواعيد لهذا الشهر. يرجى ترقية الباقة.")
        }
    }
    */
    
    // Add clinic_id to the appointment data (UUID type for appointments table)
    const appointmentData = {
        ...payload,
        clinic_id: clinicUuid, // Use the UUID for appointments table
        status: payload.status || "confirmed", // Use provided status or default to "confirmed" (clinic bookings are pre-verified)
        from: payload.from || "clinic" // Use provided source or default to "clinic"
    }

    const { data, error } = await supabase
        .from("appointments")
        .insert(appointmentData)
        .select(`
            *,
            patient:patients(name)
        `)
        .single()

    if (error) throw error
    
    // --- Google Calendar Integration Hook ---
    try {
        if (data) {
            const patientName = data.patient?.name || "مريض";
            // Use deterministic ID to prevent duplicates if bulk sync runs later
            const googleEventId = `tabibiapp${data.id}`;
            await addToGoogleCalendar({
                ...data,
                patient_name: patientName
            }, null, googleEventId);
        }
    } catch (integrationError) {
        console.error("Calendar sync failed:", integrationError);
        // Don't fail the main request, just log it
    }
    // ----------------------------------------

    // --- WhatsApp Integration Hook Removed ---
    // ---------------------------------

    return data
}

export async function updateAppointment(id, payload) {
    // Get current user's clinic_id for security
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error("Not authenticated")

    const { data: userData } = await supabase
        .from("users")
        .select("clinic_id")
        .eq("user_id", session.user.id)
        .single()

    if (!userData?.clinic_id) throw new Error("User has no clinic assigned")

    console.log("updateAppointment payload:", payload, "id:", id);

    const { data, error } = await supabase
        .from("appointments")
        .update(payload)
        .eq("id", id.toString())  // Convert to string for compatibility
        .eq("clinic_id", userData.clinic_id)
        .select()
        .single()

    if (error) {
        console.error("Error updating appointment:", error);
        console.error("Attempted to update appointment ID:", id, "at clinic:", userData.clinic_id);
        throw error;
    }
    return data
}

export async function deleteAppointment(id) {
    // Get current user's clinic_id for security
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error("Not authenticated")

    const { data: userData } = await supabase
        .from("users")
        .select("clinic_id, clinic_id_bigint")
        .eq("user_id", session.user.id)
        .single()

    if (!userData?.clinic_id) throw new Error("User has no clinic assigned")

    // Get clinic_id_bigint for financial_records if not in userData
    let clinicIdBigint = userData.clinic_id_bigint
    if (!clinicIdBigint) {
        const { data: clinicData } = await supabase
            .from("clinics")
            .select("clinic_id_bigint, id")
            .eq("clinic_uuid", userData.clinic_id)
            .single()
        
        clinicIdBigint = clinicData?.clinic_id_bigint || clinicData?.id
    }

    // Delete related records first to avoid foreign key constraints
    // 1. Delete notifications
    await supabase
        .from("notifications")
        .delete()
        .eq("appointment_id", id.toString())
        .eq("clinic_id", userData.clinic_id);

    // 2. Delete financial records (uses clinicIdBigint)
    if (clinicIdBigint) {
        await supabase
            .from("financial_records")
            .delete()
            .eq("appointment_id", id)
            .eq("clinic_id", clinicIdBigint);
    }

    // 3. Delete discount redemptions
    await supabase
        .from("discount_redemptions")
        .delete()
        .eq("appointment_id", id);

    // 4. Delete WhatsApp logs if the table exists
    try {
        await supabase
            .from("whatsapp_message_logs")
            .delete()
            .eq("appointment_id", id)
            .eq("clinic_id", userData.clinic_id);
    } catch (err) {
        // Table might not exist or other issues, ignore
        console.warn("Could not delete WhatsApp logs:", err.message);
    }

    // Finally delete the appointment itself
    const { error } = await supabase
        .from("appointments")
        .delete()
        .eq("id", id.toString())  // Convert to string for compatibility
        .eq("clinic_id", userData.clinic_id)

    if (error) {
        console.error("Error deleting appointment:", error);
        console.error("Attempted to delete appointment ID:", id, "at clinic:", userData.clinic_id);
        throw error;
    }
}

export async function searchPatients(searchTerm) {
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
        .from("patients")
        .select("id, name, phone")
        .eq("clinic_id", userData.clinic_id)
        .ilike("name", `%${searchTerm}%`)
        .limit(5)

    if (error) throw new Error("فشل البحث عن المرضى")

    return data
}

export async function createAppointmentPublic(payload, clinicId) {
    // Convert clinicId to string for JSON serialization
    const clinicIdString = clinicId.toString();

    // Check for appointment conflicts if enabled
    const { data: clinicData } = await supabase
        .from('clinics')
        .select('prevent_conflicts, min_time_gap')
        .eq('id', clinicIdString)
        .single();

    if (clinicData?.prevent_conflicts) {
        const gapMinutes = parseInt(clinicData.min_time_gap) || 0;
        const appointmentDate = new Date(payload.date);
        
        // Calculate range to check for conflicts
        const startDate = new Date(appointmentDate.getTime() - (gapMinutes - 1) * 60000);
        const endDate = new Date(appointmentDate.getTime() + (gapMinutes - 1) * 60000);

        const { data: conflicts } = await supabase
            .from('appointments')
            .select('id')
            .eq('clinic_id', clinicIdString)
            .neq('status', 'cancelled')
            .gte('date', startDate.toISOString())
            .lte('date', endDate.toISOString())
            .limit(1);

        if (conflicts && conflicts.length > 0) {
            throw new Error(`عذراً، هذا الوقت غير متاح. يرجى اختيار وقت آخر (يوجد تضارب مع حجز آخر في غضون ${gapMinutes} دقيقة)`);
        }
    }

    // Check if phone is blocked (Shadow Ban)
    // If phone is provided in payload, check against blocked_phones table
    if (payload.phone) {
        try {
            const { data: blockedData } = await supabase
                .from('blocked_phones')
                .select('id')
                .eq('clinic_id', clinicIdString)
                .eq('phone_number', payload.phone)
                .maybeSingle();
                
            if (blockedData) {
                console.log("Blocked number attempted to book. Applying Shadow Ban:", payload.phone);
                // Return fake success response (Shadow Ban)
                // The user thinks it succeeded, but nothing is saved to appointments
                return {
                    id: "blocked-" + Date.now(),
                    status: "pending",
                    clinic_id: clinicIdString,
                    ...payload,
                    created_at: new Date().toISOString()
                };
            }
        } catch (err) {
            console.error("Error checking blocked status:", err);
            // Proceed if check fails to avoid blocking legitimate users on error
        }
    }

    // Remove phone from payload as it's not a column in appointments table
    // It was only passed for the blocking check
    const { phone, ...restPayload } = payload;

    // Add clinic_id to the appointment data
    const appointmentData = {
        ...restPayload,
        clinic_id: clinicIdString,
        status: "pending",
        from: "booking" // Indicate that this appointment was created from the booking page
    }

    const { data, error } = await supabase
        .from("appointments")
        .insert(appointmentData)
        .select()
        .single()

    if (error) {
        console.error("Error creating appointment:", error);
        throw error
    }
    
    // Debug logging to see what IDs we're getting
    console.log("Appointment created with data:", data);
    console.log("Payload patient:", payload.patient);
    
    // Validate that we have a proper ID for the appointment
    if (!data.id) {
        console.error("Appointment ID is missing from created appointment");
        return data;
    }
    
    // Create notification for the new appointment
    // COMMENTED OUT: The database trigger 'on_new_appointment' already creates a notification.
    // Keeping this enabled causes duplicate notifications (Double Trigger).
    /*
    try {
        await createPublicNotification({
            clinic_id: clinicIdString,
            title: "حجز جديد",
            message: `لديك حجز جديد من ${payload.patient?.name || 'مريض'} في ${new Date(payload.date).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`,
            type: "appointment",
            // Pass the appointment ID - it should be a UUID
            appointment_id: data.id
        });
    } catch (notificationError) {
        console.error("Error creating notification:", notificationError);
        // Don't throw error here as we still want to return the appointment data
    }
    */

    // --- WhatsApp Integration Hook Removed ---
    // ---------------------------------

    return data
}

export async function getPatientAppointments(patientId) {
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
        .from("appointments")
        .select(`
            id,
            date,
            notes,
            price,
            status,
            from,
            created_at
        `)
        .eq("clinic_id", userData.clinic_id)
        .eq("patient_id", patientId)
        .order("date", { ascending: false })

    if (error) {
        console.error("Error fetching patient appointments:", error)
        throw new Error("فشل في تحميل مواعيد المريض")
    }

    return data
}

export async function getAppointmentById(id) {
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
        .from("appointments")
        .select(`
            *,
            patient:patients(*)
        `)
        .eq("id", id)
        .eq("clinic_id", userData.clinic_id)
        .single()

    if (error) {
        console.error("Error fetching appointment:", error)
        throw new Error("فشل في تحميل تفاصيل الموعد")
    }

    return data
}

export async function searchPatientsPublic(phone, clinicId) {
    if (!clinicId) throw new Error("Clinic ID is required");
    
    const { data, error } = await supabase
        .from("patients")
        .select("id, name, phone, gender, age")
        .eq("clinic_id", clinicId.toString())
        .eq("phone", phone)
        .limit(1)

    if (error) {
        console.error("Error searching patients:", error)
        throw new Error("فشل البحث عن المرضى")
    }

    return data
}

export function subscribeToAppointments(callback, clinicId, sourceFilter = null) {
    if (!clinicId) return () => {}

    console.log("subscribeToAppointments/start", { clinicId, sourceFilter })

    const subscription = supabase
        .channel(`appointments_changes_${clinicId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'appointments',
                filter: `clinic_id=eq.${clinicId}`
            },
            (payload) => {
                console.log("subscribeToAppointments/event", {
                    eventType: payload.eventType,
                    newRow: payload.new,
                    oldRow: payload.old
                })
                callback(payload)
            }
        )
        .subscribe()

    return () => {
        console.log("subscribeToAppointments/cleanup", { clinicId })
        supabase.removeChannel(subscription)
    }
}
