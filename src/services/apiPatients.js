import supabase from "./supabase"
import { dbg } from "../lib/debug"
import { createFinancialRecord } from "./apiFinancialRecords"
import * as dataService from "./dataService"
import { shouldUseOfflineMode, getClinicId } from "./apiOfflineMode"
import {
  normalizePlanLimits,
  requireActiveSubscription,
  assertMonthlyLimit,
} from "./subscriptionEnforcement"

export async function getPatients(filters = {}) {
  return dataService.get("patients", filters)
}

export async function createPatient(payload) {
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

  return dataService.create("patients", { ...payload, clinic_id: clinicId })
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
  const useOffline = shouldUseOfflineMode()
  if (useOffline) {
    const patients = await dataService.get("patients", { id })
    return patients[0] || null
  }

  const { data, error } = await supabase.from("patients").select("* text, id, name, phone, gender, address, date_of_birth, age, blood_type, job, marital_status, email, medical_history, insurance_info, age_unit, notes, custom_fields").eq("id", id).single()
  if (error) throw error
  return data
}

export async function updatePatient(id, payload) {
  return dataService.update("patients", id, payload)
}

export async function deletePatient(id) {
  return dataService.remove("patients", id)
}

export async function getPatientFinancialData(patientId) {
  // Use centralized clinic ID helper (offline-aware)
  const clinicUuid = await getClinicId();
  if (!clinicUuid) throw new Error("User has no clinic assigned");

  // If offline, return empty or cached data (financial_records are mirrored via dataService)
  if (shouldUseOfflineMode()) {
    const transactions = await dataService.get("financial_records", { patient_id: patientId.toString() });
    
    // Calculate financial summary from offline data
    const manualCharges = transactions
      .filter(t => t.type === 'charge')
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
      
    const manualPayments = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    const history = transactions.map(t => ({
      id: t.id,
      type: t.type === 'charge' ? 'charge' : 'payment',
      amount: parseFloat(t.amount) || 0,
      date: t.recorded_at || t.created_at,
      description: t.description || (t.type === 'charge' ? 'مستحقات إضافية' : 'دفعة نقدية'),
      status: 'completed'
    })).sort((a, b) => new Date(b.date) - new Date(a.date));

    return {
      totalAmount: manualCharges,
      paidAmount: manualPayments,
      remainingAmount: manualCharges - manualPayments,
      paymentHistory: history
    };
  }

  // Get clinic_id_bigint for financial_records
  let clinicIdBigint = localStorage.getItem("tabibi_clinic_id_bigint");
  
  if (!clinicIdBigint) {
      const { data: clinicData } = await supabase
          .from("clinics")
          .select("clinic_id_bigint, id")
          .eq("clinic_uuid", clinicUuid)
          .single()
      
      clinicIdBigint = clinicData?.clinic_id_bigint || clinicData?.id;
      if (clinicIdBigint) localStorage.setItem("tabibi_clinic_id_bigint", clinicIdBigint);
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
    // Use centralized clinic ID helper (offline-aware)
    const clinicUuid = await getClinicId();
    if (!clinicUuid) return { maleCount: 0, femaleCount: 0, totalCount: 0 }

    if (shouldUseOfflineMode()) {
      const all = await dataService.get("patients", { clinic_id: clinicUuid });
      let filtered = all;
      if (startDate) {
        filtered = all.filter(p => p.created_at >= startDate);
      }
      return {
        maleCount: filtered.filter(p => p.gender === "male").length,
        femaleCount: filtered.filter(p => p.gender === "female").length,
        totalCount: filtered.length
      };
    }

    let maleQuery = supabase
      .from("patients")
      .select("*", { count: "exact", head: true })
      .eq("clinic_id", clinicUuid)
      .eq("gender", "male")

    let femaleQuery = supabase
      .from("patients")
      .select("*", { count: "exact", head: true })
      .eq("clinic_id", clinicUuid)
      .eq("gender", "female")
      
    let totalQuery = supabase
      .from("patients")
      .select("*", { count: "exact", head: true })
      .eq("clinic_id", clinicUuid)

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
