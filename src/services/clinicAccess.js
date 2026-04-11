import supabase from "./supabase"

const normalizePermissionKey = (key) => {
  const k = String(key || "").trim()
  if (!k) return ""
  if (k === "calendar") return "appointments"
  return k
}

const permissionMatches = (permissions, key) => {
  const wanted = normalizePermissionKey(key)
  if (!wanted) return false

  const raw = permissions
  const arr = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? (() => { try { return JSON.parse(raw) } catch { return [] } })()
      : []

  const set = new Set(arr.map(normalizePermissionKey))
  if (set.has(wanted)) return true

  if (wanted === "appointments" && set.has("calendar")) return true
  if (wanted === "calendar" && set.has("appointments")) return true

  return false
}

export async function getMyClinicMemberships() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("clinic_memberships")
    .select("clinic_id, role, permissions")
    .eq("user_id", session.user.id)

  if (error) throw error
  return data || []
}

export async function getAllowedClinicIdsForPermission(permissionKey) {
  const memberships = await getMyClinicMemberships()
  const key = normalizePermissionKey(permissionKey)

  const allowed = memberships
    .filter((m) => m?.clinic_id)
    .filter((m) => m.role === "owner" || permissionMatches(m.permissions, key))
    .map((m) => m.clinic_id)

  return Array.from(new Set(allowed.map(String)))
}

export async function assertClinicAllowed(permissionKey, clinicUuid) {
  if (!clinicUuid) throw new Error("Clinic ID is required")
  const allowed = await getAllowedClinicIdsForPermission(permissionKey)
  if (!allowed.includes(String(clinicUuid))) throw new Error("غير مسموح لك الوصول لهذا الفرع")
  return clinicUuid
}

export async function getAllowedOwnerUserIdsForPermission(permissionKey) {
  const memberships = await getMyClinicMemberships()
  const key = normalizePermissionKey(permissionKey)

  const relevant = memberships
    .filter((m) => m?.clinic_id)
    .filter((m) => m.role === "owner" || permissionMatches(m.permissions, key))

  const clinicIds = Array.from(new Set(relevant.map((m) => String(m.clinic_id))))
  if (clinicIds.length === 0) return []

  const { data: clinics, error } = await supabase
    .from("clinics")
    .select("clinic_uuid, owner_user_id")
    .in("clinic_uuid", clinicIds)

  if (error) throw error

  const ids = (clinics || [])
    .map((c) => c?.owner_user_id)
    .filter(Boolean)

  return Array.from(new Set(ids.map(String)))
}
