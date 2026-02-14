import supabase from "./supabase";

async function getClinicIdBigintForCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("clinic_id_bigint, clinic_id")
    .eq("user_id", session.user.id)
    .single();

  if (userError) throw userError;

  let clinicIdBigint = userData?.clinic_id_bigint;

  if (!clinicIdBigint && userData?.clinic_id) {
    const { data: clinicData, error: clinicError } = await supabase
      .from("clinics")
      .select("clinic_id_bigint, id")
      .eq("clinic_uuid", userData.clinic_id)
      .single();

    if (!clinicError) clinicIdBigint = clinicData?.clinic_id_bigint || clinicData?.id;
  }

  if (!clinicIdBigint) throw new Error("User has no clinic assigned");
  return clinicIdBigint;
}

export async function getPatientFinanceLedger(patientId, filters = {}) {
  if (!patientId) throw new Error("patientId is required");

  const clinicIdBigint = await getClinicIdBigintForCurrentUser();

  let query = supabase
    .from("financial_records")
    .select(`
      id,
      clinic_id,
      patient_id,
      patient_plan_id,
      visit_id,
      appointment_id,
      amount,
      type,
      description,
      reference_key,
      recorded_at,
      created_at,
      patient:patients(id, name),
      plan:patient_plans(id, treatment_templates(name)),
      visit:visits(id, diagnosis, created_at),
      appointment:appointments(id, date, notes, status, price)
    `)
    .eq("clinic_id", clinicIdBigint)
    .eq("patient_id", patientId)
    .order("recorded_at", { ascending: false });

  if (filters.startDate) query = query.gte("recorded_at", filters.startDate);
  if (filters.endDate) query = query.lte("recorded_at", filters.endDate);
  if (filters.type && filters.type !== "all") query = query.eq("type", filters.type);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getPatientFinanceSummary(patientId, filters = {}) {
  const rows = await getPatientFinanceLedger(patientId, filters);

  const totalCharges = rows
    .filter((r) => r.type === "charge")
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const totalPayments = rows
    .filter((r) => r.type === "income")
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const balance = totalCharges - totalPayments;

  return { totalCharges, totalPayments, balance, count: rows.length };
}
