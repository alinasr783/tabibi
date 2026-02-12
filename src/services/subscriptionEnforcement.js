import supabase from "./supabase";

function parseJsonMaybe(value) {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

function getUtcMonthRange(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) {
    throw new Error("تاريخ غير صالح");
  }
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0));
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export function normalizePlanLimits(rawLimits) {
  const limits = parseJsonMaybe(rawLimits) || {};

  const maxPatients =
    limits.max_patients === undefined ? undefined : Number(limits.max_patients);
  const maxAppointments =
    limits.max_appointments === undefined ? undefined : Number(limits.max_appointments);
  const maxTreatmentTemplates =
    limits.max_treatment_templates === undefined
      ? undefined
      : Number(limits.max_treatment_templates);

  const maxSecretariesRaw =
    limits.secretary !== undefined ? limits.secretary : limits.max_secretaries;
  const maxSecretaries =
    maxSecretariesRaw === undefined ? undefined : Number(maxSecretariesRaw);

  return {
    maxPatients,
    maxAppointments,
    maxTreatmentTemplates,
    maxSecretaries,
    features: typeof limits.features === "object" && limits.features ? limits.features : {},
    raw: limits,
  };
}

export async function getCurrentClinicIdFromSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("clinic_id")
    .eq("user_id", session.user.id)
    .single();

  if (userError) throw userError;
  if (!userData?.clinic_id) throw new Error("User has no clinic assigned");
  return userData.clinic_id;
}

export async function getActiveSubscriptionWithPlan(clinicId) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      `
      id,
      status,
      current_period_start,
      current_period_end,
      billing_period,
      plan_id,
      plans:plan_id (
        id,
        name,
        limits
      )
    `
    )
    .eq("clinic_id", clinicId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  if (data.current_period_end) {
    const end = new Date(data.current_period_end);
    if (!Number.isNaN(end.getTime()) && end.getTime() <= Date.now()) {
      return null;
    }
  }

  return data;
}

export async function requireActiveSubscription(clinicId) {
  const subscription = await getActiveSubscriptionWithPlan(clinicId);
  if (!subscription) {
    throw new Error("لا يوجد اشتراك مفعل. برجاء الاشتراك في باقة للاستمرار.");
  }
  return subscription;
}

export async function assertMonthlyLimit({
  clinicId,
  table,
  dateColumn,
  monthDate,
  maxAllowed,
  errorMessage,
}) {
  if (maxAllowed === undefined || maxAllowed === null) return;
  if (Number.isNaN(Number(maxAllowed))) return;
  if (Number(maxAllowed) === -1) return;
  if (Number(maxAllowed) <= 0) {
    throw new Error(errorMessage);
  }

  const { startIso, endIso } = getUtcMonthRange(monthDate);

  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("clinic_id", clinicId)
    .gte(dateColumn, startIso)
    .lt(dateColumn, endIso);

  if (error) throw error;
  if ((count ?? 0) >= Number(maxAllowed)) {
    throw new Error(errorMessage);
  }
}

export async function assertCountLimit({
  clinicId,
  table,
  maxAllowed,
  errorMessage,
  extraFilter,
}) {
  if (maxAllowed === undefined || maxAllowed === null) return;
  if (Number.isNaN(Number(maxAllowed))) return;
  if (Number(maxAllowed) === -1) return;
  if (Number(maxAllowed) <= 0) {
    throw new Error(errorMessage);
  }

  let query = supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("clinic_id", clinicId);

  if (typeof extraFilter === "function") {
    query = extraFilter(query);
  }

  const { count, error } = await query;
  if (error) throw error;
  if ((count ?? 0) >= Number(maxAllowed)) {
    throw new Error(errorMessage);
  }
}

