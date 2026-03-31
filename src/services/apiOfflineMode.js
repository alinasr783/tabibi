import supabase from "./supabase"

export async function verifyCurrentUserPassword(password) {
  if (!password) throw new Error("كلمة المرور مطلوبة")
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Not authenticated")

  let email = session.user?.email || null
  if (!email) {
    const { data: userRow, error } = await supabase
      .from("users")
      .select("email")
      .eq("user_id", session.user.id)
      .single()
    if (error) throw new Error("لا يمكن تحديد البريد الإلكتروني للحساب")
    email = userRow?.email || null
  }
  if (!email) throw new Error("لا يمكن تحديد البريد الإلكتروني للحساب")

  const res = await supabase.auth.signInWithPassword({ email, password })
  if (res.error) throw new Error(res.error.message || "فشل التحقق")
  return true
}

export async function ensureServiceWorkerRegistered() {
  if (!("serviceWorker" in navigator)) return false
  const regs = await navigator.serviceWorker.getRegistrations()
  const hasTabibiSw = regs.some((r) => String(r?.active?.scriptURL || "").includes("/sw.js"))
  if (hasTabibiSw) return true
  await navigator.serviceWorker.register("/sw.js")
  return true
}

export async function getServerCountsForClinic(clinicUuid) {
  const [patientsRes, appointmentsRes] = await Promise.all([
    supabase.from("patients").select("id", { count: "exact", head: true }).eq("clinic_id", clinicUuid),
    supabase.from("appointments").select("id", { count: "exact", head: true }).eq("clinic_id", clinicUuid),
  ])
  if (patientsRes.error) throw new Error(patientsRes.error.message || "Failed to count patients")
  if (appointmentsRes.error) throw new Error(appointmentsRes.error.message || "Failed to count appointments")
  return { patients: patientsRes.count || 0, appointments: appointmentsRes.count || 0 }
}
