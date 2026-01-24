import supabase from "./supabase"
import { createFinancialRecord } from "./apiFinancialRecords"

export async function getPatients(search, page, pageSize, filters = {}) {
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
    .from("patients")
    .select(`
      id,
      name,
      phone,
      gender,
      address,
      date_of_birth,
      age,
      blood_type,
      created_at,
      medical_history,
      appointments(date, status)
    `, { count: "exact" })
    .eq("clinic_id", userData.clinic_id)
    .order("created_at", { ascending: false })
    .range(from, to)
    
  if (filters.gender) {
    query = query.eq("gender", filters.gender)
  }

  if (filters.createdAfter) {
    query = query.gte("created_at", filters.createdAfter)
  }

  if (search && search.trim()) {
    const trimmed = search.trim()
    const isIdSearch = /^(?:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|\d+)$/.test(trimmed)
    if (isIdSearch) {
      query = query.eq("id", trimmed)
    } else {
      const s = `%${trimmed}%`
      query = query.or(`name.ilike.${s},phone.ilike.${s}`)
    }
  }
  const { data, error, count } = await query
  if (error) throw error
  return { items: data ?? [], total: count ?? 0 }
}

export async function createPatient(payload) {
  // Get current user's clinic_id
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Not authenticated")

  const { data: userData } = await supabase
    .from("users")
    .select("clinic_id")
    .eq("user_id", session.user.id)
    .single()

  if (!userData?.clinic_id) throw new Error("User has no clinic assigned")

  /*
  // Security checks disabled by user request
  /*
  // get clinic subscription plan
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*, plans(limits)')
    .eq('clinic_id', userData.clinic_id)
    .eq('status', 'active')
    .single()

  if (!subscription) throw new Error("لا يوجد اشتراك مفعل")

  const maxPatients = subscription.plans.limits.max_patients
  const periodStart = subscription.current_period_start

  // 3. احسب عدد المرضى المضافين في الشهر الحالي فقط
  if (maxPatients !== -1) {
    const { count } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', userData.clinic_id)
      .gte('created_at', periodStart) // أهم شرط: أكبر من أو يساوي تاريخ بداية الباقة

    // 4. المقارنة الحاسمة
    if (count >= maxPatients) {
      throw new Error("لقد تجاوزت الحد المسموح من المرضى لهذا الشهر. يرجى ترقية الباقة.")
    }
  }
  */
  // Add clinic_id to the patient data
  const patientData = {
    ...payload,
    clinic_id: payload.clinic_id || userData.clinic_id
  }

  const { data, error } = await supabase
    .from("patients")
    .insert(patientData)
    .select()
    .single()

  if (error) {
    console.error("Error creating patient:", error)
    throw error
  }

  // Debug: Log the created patient data
  console.log("createPatient returning data:", data);
  return data
}

// New function for public booking - create patient without authentication
export async function createPatientPublic(payload) {
  // Convert clinic_id to BigInt for database operations if it exists
  const patientData = { ...payload }

  if (patientData.clinic_id) {
    // Keep clinic_id as string to avoid BigInt serialization issues
    patientData.clinic_id = patientData.clinic_id.toString()
  }

  // If age is provided, ensure it's an integer
  if (patientData.age) {
    patientData.age = parseInt(patientData.age, 10);
  }

  const { data, error } = await supabase
    .from("patients")
    .insert(patientData)
    .select()
    .single()

  if (error) {
    console.error("Error creating patient:", error)
    throw error
  }

  // Debug: Log the created patient data
  console.log("createPatientPublic returning data:", data);
  return data
}

export async function getPatientById(id) {
  // Debug: Log the ID being used for fetching
  console.log("getPatientById called with ID:", id);

  // Get current user's clinic_id for security
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Not authenticated")

  const { data: userData } = await supabase
    .from("users")
    .select("clinic_id")
    .eq("user_id", session.user.id)
    .single()

  if (!userData?.clinic_id) throw new Error("User has no clinic assigned")

  // Query patients table - using id and clinic_id
  // Note: The id might be a number or UUID, and clinic_id might be a number or UUID
  // depending on the actual database schema
  const { data, error } = await supabase
    .from("patients")
    .select("id,name,phone,gender,address,date_of_birth,age,blood_type,job,marital_status,email,medical_history,insurance_info,age_unit,notes")
    .eq("id", id.toString())  // Convert to string to handle both number and UUID IDs
    .eq("clinic_id", userData.clinic_id)
    .single()
  if (error) {
    console.error("Error fetching patient by ID:", error);
    console.error("Attempted to fetch patient ID:", id, "for clinic:", userData.clinic_id);

    // Check if the error is because the patient doesn't exist
    if (error.code === 'PGRST116' && error.details === 'The result contains 0 rows') {
      console.warn(`Patient with ID ${id} not found in clinic ${userData.clinic_id}`);
      return null; // Return null instead of throwing for missing patient
    }

    throw error;
  }
  return data
}

export async function updatePatient(id, payload) {
  // Get current user's clinic_id for security
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Not authenticated")

  const { data: userData } = await supabase
    .from("users")
    .select("clinic_id")
    .eq("user_id", session.user.id)
    .single()

  if (!userData?.clinic_id) throw new Error("User has no clinic assigned")

  // Update patient - convert id to string to handle both number and UUID IDs
  const { data, error } = await supabase
    .from("patients")
    .update(payload)
    .eq("id", id.toString())  // Convert to string to handle both number and UUID IDs
    .eq("clinic_id", userData.clinic_id)
    .select()
    .single()
  if (error) {
    console.error("Error updating patient:", error);
    console.error("Attempted to update patient ID:", id, "for clinic:", userData.clinic_id);
    throw error
  }
  return data
}

export async function getPatientFinancialData(patientId) {
  // Get current user's clinic_id
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const { data: userData } = await supabase
    .from("users")
    .select("clinic_id, clinic_id_bigint")
    .eq("user_id", session.user.id)
    .single();

  if (!userData?.clinic_id) throw new Error("User has no clinic assigned");

  // Get clinic_id_bigint for financial_records
  let clinicIdBigint = userData?.clinic_id_bigint
  
  if (!clinicIdBigint && userData?.clinic_id) {
      const { data: clinicData } = await supabase
          .from("clinics")
          .select("clinic_id_bigint, id")
          .eq("clinic_uuid", userData.clinic_id)
          .single()
      
      clinicIdBigint = clinicData?.clinic_id_bigint || clinicData?.id
  }

  // Get all appointments for this patient
  const { data: appointments, error: appointmentsError } = await supabase
    .from("appointments")
    .select(`
      id,
      price,
      status,
      created_at,
      date,
      notes
    `)
    .eq("clinic_id", userData.clinic_id)
    .eq("patient_id", patientId.toString())
    .order("date", { ascending: false });

  // Get financial records (transactions)
  let transactions = [];
  try {
    if (clinicIdBigint) {
      const { data: transData, error: transError } = await supabase
        .from("financial_records")
        .select("*")
        .eq("clinic_id", clinicIdBigint)
        .eq("patient_id", patientId.toString()) // patient_id is bigint in financial_records, but passed as string/number
        .order("created_at", { ascending: false });
      
      if (!transError && transData) {
        transactions = transData;
      }
    }
  } catch (err) {
    console.warn("Could not fetch financial records", err);
  }

  if (appointmentsError && appointmentsError.code !== 'PGRST116') {
    console.error("Error fetching patient appointments:", appointmentsError);
  }

  const safeAppointments = appointments || [];

  // Calculate financial summary
  // 1. Dues from Appointments (completed ones)
  const completedAppointments = safeAppointments.filter(app => app.status === 'completed');
  const appointmentDues = completedAppointments.reduce((sum, appointment) => sum + (parseFloat(appointment.price) || 0), 0);

  // 2. Manual Transactions from financial_records
  // We map 'charge' to 'Add Dues' and 'income' to 'Payment' (Pay Dues)
  // based on the user's request to use this table for patient balances.
  const manualCharges = transactions
    .filter(t => t.type === 'charge')
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    
  const manualPayments = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

  const totalAmount = appointmentDues + manualCharges;
  const paidAmount = manualPayments; 
  const remainingAmount = totalAmount - paidAmount;

  // Transform data for payment history
  const history = [
    ...completedAppointments.map(app => ({
      id: app.id,
      type: 'appointment',
      amount: parseFloat(app.price) || 0,
      date: app.date,
      description: 'موعد: ' + (app.notes || ''),
      status: 'completed'
    })),
    ...transactions.map(t => ({
      id: t.id,
      type: t.type === 'charge' ? 'charge' : 'payment',
      amount: parseFloat(t.amount) || 0,
      date: t.created_at || t.recorded_at,
      description: t.description || (t.type === 'charge' ? 'مستحقات إضافية' : 'دفعة نقدية'),
      status: 'completed'
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    totalAmount,
    paidAmount,
    remainingAmount,
    paymentHistory: history
  };
}

export async function addPatientTransaction(payload) {
  // Map 'charge'/'payment' to 'charge'/'income' for financial_records
  // NOTE: This requires 'charge' to be added to the CHECK constraint of financial_records type column
  const typeMap = {
    'charge': 'charge',
    'payment': 'income'
  };

  const financialPayload = {
    patient_id: payload.patient_id,
    amount: payload.amount,
    type: typeMap[payload.type] || 'income', 
    description: payload.description || (payload.type === 'charge' ? 'مستحقات إضافية' : 'دفعة نقدية'),
    recorded_at: payload.date || new Date().toISOString()
  };

  return await createFinancialRecord(financialPayload);
}


export async function getPatientStats(startDate) {
  try {
    // Get current user's clinic_id
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return { maleCount: 0, femaleCount: 0, totalCount: 0 }

    const { data: userData } = await supabase
      .from("users")
      .select("clinic_id")
      .eq("user_id", session.user.id)
      .single()

    if (!userData?.clinic_id) return { maleCount: 0, femaleCount: 0, totalCount: 0 }

    let maleQuery = supabase
      .from("patients")
      .select("*", { count: "exact", head: true })
      .eq("clinic_id", userData.clinic_id)
      .eq("gender", "male")

    let femaleQuery = supabase
      .from("patients")
      .select("*", { count: "exact", head: true })
      .eq("clinic_id", userData.clinic_id)
      .eq("gender", "female")
      
    let totalQuery = supabase
      .from("patients")
      .select("*", { count: "exact", head: true })
      .eq("clinic_id", userData.clinic_id)

    if (startDate) {
      maleQuery = maleQuery.gte("created_at", startDate)
      femaleQuery = femaleQuery.gte("created_at", startDate)
      totalQuery = totalQuery.gte("created_at", startDate)
    }

    const [maleRes, femaleRes, totalRes] = await Promise.all([
      maleQuery,
      femaleQuery,
      totalQuery
    ])

    return { 
      maleCount: maleRes.count || 0, 
      femaleCount: femaleRes.count || 0, 
      totalCount: totalRes.count || 0 
    };
  } catch (error) {
    console.error("Error fetching patient stats:", error);
    return { maleCount: 0, femaleCount: 0, totalCount: 0 };
  }
}
