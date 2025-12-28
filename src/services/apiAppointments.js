import supabase from "./supabase"
import { createPublicNotification } from "./apiNotifications"

export async function getAppointments(search, page, pageSize, filters = {}) {
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
        .from("appointments")
        .select(`
      id,
      date,
      notes,
      price,
      status,
      from,
      age,
      patient:patients(id, name, phone),
      created_at
    `, { count: "exact" })
        .eq("clinic_id", userData.clinic_id)

    // Apply time filter
    if (filters.time === "upcoming") {
        const now = new Date().toISOString()
        query = query.gte('date', now)

        query = query.order("status", { ascending: false })
            .order("date", { ascending: true })
    } else {
        // For all appointments, sort by date descending (newest first)
        // But for online bookings (source: booking), prioritize pending status
        if (filters.source === "booking") {
            // Custom sorting: pending status first, then by created_at (newest first)
            // We'll handle this sorting manually after fetching the data
            query = query.order("created_at", { ascending: false })
        } else {
            query = query.order("date", { ascending: false })
        }
    }

    // Apply range for pagination
    query = query.range(from, to)

    // Apply date range filter if provided
    if (filters.dateFrom || filters.dateTo) {
        if (filters.dateFrom) {
            const startDate = new Date(filters.dateFrom)
            startDate.setHours(0, 0, 0, 0)
            query = query.gte('date', startDate.toISOString())
        }
        if (filters.dateTo) {
            const endDate = new Date(filters.dateTo)
            endDate.setHours(23, 59, 59, 999)
            query = query.lte('date', endDate.toISOString())
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
    }

    // Apply status filter if provided (skip if "all")
    if (filters.status && filters.status !== "all") {
        query = query.eq('status', filters.status)
    }

    // Apply source filter if provided (skip if "all")
    if (filters.source && filters.source !== "all") {
        query = query.eq('from', filters.source)
    }
    
    // Apply notes filter if provided
    if (filters.hasNotes) {
        query = query.not('notes', 'is', null)
        query = query.neq('notes', '')
    }

    // Apply search term if provided
    if (search) {
        const s = `%${search.trim()}%`
        query = query.or(`patient.name.ilike.${s},patient.phone.ilike.${s}`)
    }

    const { data, error, count } = await query

    if (error) throw error
    
    // For online bookings, manually sort to put pending first
    let sortedData = data ?? []
    if (filters.source === "booking" && sortedData.length > 0) {
        sortedData = [...sortedData].sort((a, b) => {
            // If one is pending and the other is not, pending comes first
            if (a.status === "pending" && b.status !== "pending") return -1
            if (b.status === "pending" && a.status !== "pending") return 1
            // If both are pending or both are not pending, sort by created_at (newest first)
            return new Date(b.created_at) - new Date(a.created_at)
        })
    }
    
    return { items: sortedData, total: count ?? 0 }
}

export async function createAppointmentPublic(payload, clinicId) {
    // Convert clinicId to string for JSON serialization
    const clinicIdString = clinicId.toString();

    // Add clinic_id to the appointment data
    const appointmentData = {
        ...payload,
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

    return data
}

export async function createAppointment(payload) {
    // Get current user's clinic_id
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error("Not authenticated")

    const { data: userData } = await supabase
        .from("users")
        .select("clinic_id")
        .eq("user_id", session.user.id)
        .single()

    if (!userData?.clinic_id) throw new Error("User has no clinic assigned")
    
    // The clinic_id in users table is a UUID that matches clinic_uuid in clinics table
    const clinicUuid = userData.clinic_id;

    // For subscriptions, we need to check if the clinic_id is stored as UUID or BIGINT
    // Let's try both approaches to handle the inconsistency
    let subscription = null;
    let subscriptionError = null;
    
    // First, try querying subscriptions by UUID (as in the actual database)
    try {
        const { data, error } = await supabase
            .from('subscriptions')
            .select('*, plans(limits)')
            .eq('clinic_id', clinicUuid)  // Try with UUID first
            .eq('status', 'active')
            .single()
        
        if (error) throw error
        subscription = data
    } catch (err) {
        subscriptionError = err
        console.log("Failed to find subscription by UUID, will try by BIGINT")
    }
    
    // If that fails, try querying by BIGINT (as in the project schema)
    if (!subscription) {
        try {
            // Get the BIGINT clinic_id from clinics table
            const { data: clinicData } = await supabase
                .from('clinics')
                .select('clinic_id_bigint')
                .eq('clinic_uuid', clinicUuid)
                .single()
            
            if (clinicData?.clinic_id_bigint) {
                const { data, error } = await supabase
                    .from('subscriptions')
                    .select('*, plans(limits)')
                    .eq('clinic_id', clinicData.clinic_id_bigint)  // Try with BIGINT
                    .eq('status', 'active')
                    .single()
                
                if (!error) {
                    subscription = data
                }
            }
        } catch (err) {
            console.log("Failed to find subscription by BIGINT as well")
        }
    }
    
    // If we still don't have a subscription, show a more helpful error
    if (!subscription) {
        console.error("Subscription not found with either method:", subscriptionError)
        throw new Error("لا يوجد اشتراك مفعل. يرجى التحقق من صفحة الاشتراكات.")
    }

    const maxAppointments = subscription.plans.limits.max_appointments
    const periodStart = subscription.current_period_start

    // Check if maxPatients is -1 (unlimited), skip the count check if so
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
        .select()
        .single()

    if (error) throw error
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
        .select("clinic_id")
        .eq("user_id", session.user.id)
        .single()

    if (!userData?.clinic_id) throw new Error("User has no clinic assigned")

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

    const s = `%${searchTerm.trim()}%`
    const { data, error } = await supabase
        .from("patients")
        .select("id, name, phone")
        .eq("clinic_id", userData.clinic_id)
        .or(`name.ilike.${s},phone.ilike.${s}`)
        .limit(5)

    if (error) {
        console.error("Error searching patients:", error);
        console.error("Attempted to search patients at clinic:", userData.clinic_id);
        throw error;
    }
    return data ?? []
}

// New function for public booking - search patients by phone only
export async function searchPatientsPublic(searchTerm, clinicId) {
    // Only search by phone number for public booking
    const s = `%${searchTerm.trim()}%`
    const { data, error } = await supabase
        .from("patients")
        .select("id, name, phone")
        .eq("clinic_id", clinicId)
        .ilike("phone", s)
        .limit(5)

    if (error) {
        console.error("Error searching patients:", error);
        console.error("Attempted to search patients at clinic:", clinicId);
        throw error;
    }
    return data ?? []
}

// New function to get appointments for a specific patient
export async function getAppointmentsByPatientId(patientId) {
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
      created_at
    `)
        .eq("clinic_id", userData.clinic_id)
        .eq("patient_id", patientId.toString())  // Convert to string for compatibility
        // Show all appointments for the patient, sorted by date descending (newest first)
        .order("date", { ascending: false })

    if (error) {
        console.error("Error fetching appointments by patient ID:", error);
        console.error("Attempted to fetch appointments for patient ID:", patientId, "at clinic:", userData.clinic_id);
        
        // Check if the error is because there are no appointments for this patient
        if (error.code === 'PGRST116' && error.details === 'The result contains 0 rows') {
            console.warn(`No appointments found for patient with ID ${patientId} in clinic ${userData.clinic_id}`);
            return [];
        }
        
        throw error;
    }
    return data ?? []
}

// New function to get a single appointment by ID
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
      id,
      date,
      notes,
      price,
      status,
      from,
      created_at,
      patient:patients(id, name, phone)
    `)
        .eq("id", id.toString())  // Convert to string for compatibility
        .eq("clinic_id", userData.clinic_id)
        .single()

    if (error) {
        console.error("Error fetching appointment by ID:", error);
        console.error("Attempted to fetch appointment ID:", id, "at clinic:", userData.clinic_id);
        throw error;
    }
    return data
}

// New function to subscribe to real-time appointment changes
export function subscribeToAppointments(callback, clinicId, sourceFilter = null) {
    const channelName = `appointments-${clinicId}${sourceFilter ? `-${sourceFilter}` : ''}`;
    console.log('Creating subscription channel:', channelName);
    
    let query = supabase
        .channel(channelName)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'appointments',
                filter: `clinic_id=eq.${clinicId}`
            },
            (payload) => {
                console.log('Appointment change received:', payload);
                // If source filter is specified, only trigger callback for matching source
                if (!sourceFilter || payload.new?.from === sourceFilter || payload.old?.from === sourceFilter) {
                    callback(payload);
                }
            }
        );
    
    // Subscribe to the channel
    const subscription = query.subscribe((status) => {
        console.log('Subscription status for', channelName, ':', status);
    });
    
    // Return unsubscribe function
    return () => {
        console.log('Unsubscribing from', channelName);
        supabase.removeChannel(subscription);
    };
}