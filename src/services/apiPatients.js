import supabase from "./supabase"
import { dbg } from "../lib/debug"
import { createFinancialRecord } from "./apiFinancialRecords"
import {
  normalizePlanLimits,
  requireActiveSubscription,
  assertMonthlyLimit,
} from "./subscriptionEnforcement"

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

  const subscription = await requireActiveSubscription(userData.clinic_id)
  const limits = normalizePlanLimits(subscription?.plans?.limits)

  await assertMonthlyLimit({
    clinicId: userData.clinic_id,
    table: "patients",
    dateColumn: "created_at",
    monthDate: new Date(),
    maxAllowed: limits.maxPatients,
    errorMessage: "لقد تجاوزت الحد المسموح من المرضى لهذا الشهر. يرجى ترقية الباقة.",
  })

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

  return data
}

// New function for public booking - create patient without authentication
export async function createPatientPublic(payload) {
  const patientData = { ...payload }
  if (!patientData.clinic_id) {
    throw new Error("معرف العيادة مطلوب")
  }

  dbg("booking/createPatientPublic/input", {
    ...patientData,
    __types: Object.fromEntries(Object.keys(patientData).map((k) => [k, typeof patientData[k]])),
  })

  for (const key of Object.keys(patientData)) {
    const v = patientData[key]
    if (v === Infinity || v === -Infinity) patientData[key] = null
    if (typeof v === "string") {
      const s = v.trim().toLowerCase()
      if (s === "infinity" || s === "+infinity" || s === "-infinity" || s === "nan") {
        patientData[key] = null
      }
    }
  }

  const subscription = await requireActiveSubscription(patientData.clinic_id)
  const limits = normalizePlanLimits(subscription?.plans?.limits)

  await assertMonthlyLimit({
    clinicId: patientData.clinic_id,
    table: "patients",
    dateColumn: "created_at",
    monthDate: new Date(),
    maxAllowed: limits.maxPatients,
    errorMessage: "لقد تجاوزت الحد المسموح من المرضى لهذا الشهر. يرجى ترقية الباقة.",
  })

  // If age is provided, ensure it's an integer
  if (patientData.age !== undefined && patientData.age !== null && String(patientData.age).trim() !== "") {
    const n = Number(patientData.age);
    if (Number.isFinite(n)) patientData.age = Math.max(1, Math.min(120, Math.trunc(n)));
    else patientData.age = null;
  } else {
    patientData.age = null;
  }

  const insertData = {
    name: patientData.name,
    phone: patientData.phone,
    gender: patientData.gender,
    age: patientData.age,
    clinic_id: patientData.clinic_id,
  }

  dbg("booking/createPatientPublic/sanitized", {
    insertData,
    __types: Object.fromEntries(Object.keys(insertData).map((k) => [k, typeof insertData[k]])),
  })

  const { data, error } = await supabase
    .from("patients")
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error("Error creating patient:", error)
    dbg("booking/createPatientPublic/error", { message: error?.message, code: error?.code, details: error?.details, hint: error?.hint })
    throw error
  }

  dbg("booking/createPatientPublic/success", data)
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
    .select("id,name,phone,gender,address,date_of_birth,age,blood_type,job,marital_status,email,medical_history,insurance_info,age_unit,notes,custom_fields")
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

export async function deletePatient(id) {
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

    const patientIdStr = id.toString();

    // 1. Delete notifications
    await supabase
        .from("notifications")
        .delete()
        .eq("patient_id", patientIdStr)
        .eq("clinic_id", userData.clinic_id);

    // 2. Delete related records for each appointment
    // First, get all appointment IDs for this patient
    const { data: appointments } = await supabase
        .from("appointments")
        .select("id")
        .eq("patient_id", patientIdStr)
        .eq("clinic_id", userData.clinic_id);

    if (appointments?.length > 0) {
        const appointmentIds = appointments.map(app => app.id.toString());
        
        // Bulk delete appointment-related records
        await supabase.from("notifications").delete().in("appointment_id", appointmentIds);
        
        if (clinicIdBigint) {
            await supabase.from("financial_records").delete().in("appointment_id", appointmentIds).eq("clinic_id", clinicIdBigint);
        }
        
        await supabase.from("discount_redemptions").delete().in("appointment_id", appointmentIds);
        
        try {
            await supabase.from("whatsapp_message_logs").delete().in("appointment_id", appointmentIds);
        } catch (e) { /* ignore */ }
        
        // Delete appointments
        await supabase.from("appointments").delete().in("id", appointmentIds);
    }

    // 3. Delete visits
    await supabase
        .from("visits")
        .delete()
        .eq("patient_id", patientIdStr)
        .eq("clinic_id", userData.clinic_id);

    // 4. Delete financial records linked directly to patient
    if (clinicIdBigint) {
        await supabase
            .from("financial_records")
            .delete()
            .eq("patient_id", patientIdStr)
            .eq("clinic_id", clinicIdBigint);
    }

    // 5. Delete patient plans
    await supabase
        .from("patient_plans")
        .delete()
        .eq("patient_id", patientIdStr);

    // 6. Delete attachments and files from storage
    const { data: attachments } = await supabase
        .from("patient_attachments")
        .select("id, file_url")
        .eq("patient_id", patientIdStr);

    if (attachments?.length > 0) {
        // Delete files from storage
        for (const attachment of attachments) {
            try {
                const urlParts = attachment.file_url.split('/patient-attachments/');
                if (urlParts.length > 1) {
                    const filePath = urlParts[1];
                    await supabase.storage
                        .from("patient-attachments")
                        .remove([filePath]);
                }
            } catch (err) {
                console.warn("Could not delete file from storage:", err);
            }
        }
        
        // Delete attachment records
        await supabase
            .from("patient_attachments")
            .delete()
            .eq("patient_id", patientIdStr);
    }

    // Finally delete the patient itself
    const { error } = await supabase
        .from("patients")
        .delete()
        .eq("id", patientIdStr)
        .eq("clinic_id", userData.clinic_id)

    if (error) {
        console.error("Error deleting patient:", error);
        throw error;
    }
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

  // Calculate financial summary
  // Dues from financial_records.type='charge'
  const manualCharges = transactions
    .filter(t => t.type === 'charge')
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    
  // Payments from financial_records.type='income'
  const manualPayments = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

  const totalAmount = manualCharges;
  const paidAmount = manualPayments; 
  const remainingAmount = totalAmount - paidAmount;

  // Transform data for payment history
  const history = [
    ...transactions.map(t => ({
      id: t.id,
      type: t.type === 'charge' ? 'charge' : 'payment',
      amount: parseFloat(t.amount) || 0,
      date: t.recorded_at || t.created_at,
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
