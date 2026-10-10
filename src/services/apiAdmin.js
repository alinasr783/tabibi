import supabase from "./supabase"

const PAGE_SIZE = 20

export async function logAdminAction({ action, target_table = null, target_id = null, details = {} }) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    await supabase.from("admin_audit_logs").insert({
      admin_user_id: session?.user?.id || null,
      action,
      target_table,
      target_id: target_id ? String(target_id) : null,
      details,
    })
  } catch {
    // best-effort, لا نكسر تجربة الأدمن لو جدول التدقيق غير موجود بعد
  }
}

export async function getAdminStats() {
  const [users, clinics, subs, appSubs] = await Promise.all([
    supabase.from("users").select("user_id", { count: "exact", head: true }),
    supabase.from("clinics").select("clinic_uuid", { count: "exact", head: true }),
    supabase.from("subscriptions").select("id, amount", { count: "exact" }).eq("status", "active"),
    supabase.from("app_subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
  ])

  if (users.error) throw users.error
  if (clinics.error) throw clinics.error
  if (subs.error) throw subs.error

  const revenue = (subs.data || []).reduce((s, r) => s + (Number(r.amount) || 0), 0)

  return {
    totalUsers: users.count || 0,
    totalClinics: clinics.count || 0,
    activeSubscriptions: subs.count || 0,
    activeAppSubs: appSubs.count || 0,
    revenue,
  }
}

export async function searchUsers({ query = "", role = "all", page = 0, pageSize = PAGE_SIZE } = {}) {
  let q = supabase
    .from("users")
    .select("user_id, email, name, phone, role, is_admin, clinic_id, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1)

  if (role !== "all") q = q.eq("role", role)
  if (query.trim()) {
    const s = query.trim()
    q = q.or(`email.ilike.%${s}%,name.ilike.%${s}%,phone.ilike.%${s}%`)
  }
  const { data, error, count } = await q
  if (error) throw error
  return { rows: data || [], total: count || 0 }
}

export async function updateUserAdmin({ userId, role, is_admin }) {
  const payload = {}
  if (role !== undefined) payload.role = role
  if (is_admin !== undefined) payload.is_admin = is_admin
  const { data, error } = await supabase.from("users").update(payload).eq("user_id", userId).select().single()
  if (error) throw error
  await logAdminAction({ action: "update_user", target_table: "users", target_id: userId, details: payload })
  return data
}

export async function getAdminClinics({ query = "", page = 0, pageSize = PAGE_SIZE } = {}) {
  let q = supabase
    .from("clinics")
    .select("clinic_uuid, name, address, current_plan, online_booking_enabled, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1)
  if (query.trim()) {
    const s = query.trim()
    q = q.or(`name.ilike.%${s}%,address.ilike.%${s}%`)
  }
  const { data, error, count } = await q
  if (error) throw error
  return { rows: data || [], total: count || 0 }
}

export async function getAdminSubscriptions({ status = "active", page = 0, pageSize = PAGE_SIZE } = {}) {
  let q = supabase
    .from("subscriptions")
    .select("id, clinic_id, plan_id, status, billing_period, amount, current_period_start, current_period_end, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1)
  if (status !== "all") q = q.eq("status", status)
  const { data, error, count } = await q
  if (error) throw error
  return { rows: data || [], total: count || 0 }
}

export async function cancelAdminSubscription(id) {
  const { data, error } = await supabase.from("subscriptions").update({ status: "cancelled" }).eq("id", id).select().single()
  if (error) throw error
  await logAdminAction({ action: "cancel_subscription", target_table: "subscriptions", target_id: id })
  return data
}

export async function extendAdminSubscription(id, months = 1) {
  const { data: current, error: fetchError } = await supabase
    .from("subscriptions").select("current_period_end").eq("id", id).single()
  if (fetchError) throw fetchError
  const base = current?.current_period_end ? new Date(current.current_period_end) : new Date()
  base.setMonth(base.getMonth() + months)
  const { data, error } = await supabase
    .from("subscriptions").update({ current_period_end: base.toISOString(), status: "active" })
    .eq("id", id).select().single()
  if (error) throw error
  await logAdminAction({ action: "extend_subscription", target_table: "subscriptions", target_id: id, details: { months } })
  return data
}

export async function getAdminPlans() {
  const { data, error } = await supabase
    .from("plan_pricing").select("id, name, price, popular, features, description, discount_type, discount_value, discount_ends_at").order("price", { ascending: true })
  if (error) throw error
  return data || []
}

export async function updateAdminPlan(id, payload) {
  const { data, error } = await supabase.from("plan_pricing").update(payload).eq("id", id).select().single()
  if (error) throw error
  await logAdminAction({ action: "update_plan", target_table: "plan_pricing", target_id: id, details: payload })
  return data
}

export async function getAdminApps() {
  const { data, error } = await supabase
    .from("tabibi_apps")
    .select("id, title, price, billing_period, category, is_active, views_count, component_key, created_at")
    .order("created_at", { ascending: false })
    .limit(100)
  if (error) throw error
  return data || []
}

export async function toggleAdminApp(id, is_active) {
  const { data, error } = await supabase.from("tabibi_apps").update({ is_active }).eq("id", id).select().single()
  if (error) throw error
  await logAdminAction({ action: "toggle_app", target_table: "tabibi_apps", target_id: id, details: { is_active } })
  return data
}

export async function updateAdminAppPrice(id, price) {
  const { data, error } = await supabase.from("tabibi_apps").update({ price }).eq("id", id).select().single()
  if (error) throw error
  await logAdminAction({ action: "update_app_price", target_table: "tabibi_apps", target_id: id, details: { price } })
  return data
}

export async function getAuditLogs(page = 0, pageSize = PAGE_SIZE) {
  const { data, error, count } = await supabase
    .from("admin_audit_logs")
    .select("id, created_at, admin_user_id, action, target_table, target_id, details", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1)
  if (error) throw error
  return { rows: data || [], total: count || 0 }
}
