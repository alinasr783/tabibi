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

  // First try clinic_memberships table
  const { data: membershipsData, error: membershipsError } = await supabase
    .from("clinic_memberships")
    .select("clinic_id, role, permissions")
    .eq("user_id", session.user.id)

  if (membershipsError) {
    console.warn("Error fetching memberships, trying clinics table:", membershipsError)
  }

  // Also get clinics where user is owner from clinics table
  const { data: ownedClinics, error: ownedError } = await supabase
    .from("clinics")
    .select("clinic_uuid")
    .eq("owner_user_id", session.user.id)

  if (ownedError) {
    console.warn("Error fetching owned clinics:", ownedError)
  }

  // Combine both sources
  let allClinics = []

  if (membershipsData && membershipsData.length > 0) {
    allClinics = membershipsData.map(m => ({
      clinic_id: m.clinic_id,
      role: m.role,
      permissions: m.permissions
    }))
  }

  if (ownedClinics && ownedClinics.length > 0) {
    const ownedClinicIds = ownedClinics.map(c => c.clinic_uuid)
    // Add owned clinics if not already present
    ownedClinicIds.forEach(clinicId => {
      if (!allClinics.find(c => c.clinic_id === clinicId)) {
        allClinics.push({
          clinic_id: clinicId,
          role: "owner",
          permissions: ["*"]
        })
      }
    })
  }

  return allClinics
}

// Helper function to get ALL clinic IDs owned by current user (regardless of permissions)
export async function getAllMyClinicIds() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Not authenticated")

  console.log("getAllMyClinicIds - User ID:", session.user.id)

  // First: Get user's primary clinic from users table
  const { data: userData } = await supabase
    .from("users")
    .select("clinic_id")
    .eq("user_id", session.user.id)
    .single()
  
  console.log("getAllMyClinicIds - User's primary clinic_id:", userData?.clinic_id)

  // Second: Get clinics where user is owner
  const { data: ownedClinics, error: ownedError } = await supabase
    .from("clinics")
    .select("clinic_uuid")
    .eq("owner_user_id", session.user.id)

  console.log("getAllMyClinicIds - Owned clinics:", ownedClinics, ownedError)

  // Third: Try to get clinics from memberships (if table exists)
  let membershipClinicIds = []
  try {
    const { data: memberships, error: membershipError } = await supabase
      .from("clinic_memberships")
      .select("clinic_id")
      .eq("user_id", session.user.id)
    
    console.log("getAllMyClinicIds - Memberships:", memberships, membershipError)
    
    if (memberships && !membershipError) {
      membershipClinicIds = memberships.map(m => m.clinic_id).filter(Boolean)
    }
  } catch (e) {
    console.log("getAllMyClinicIds - clinic_memberships table not available:", e.message)
  }

  // Combine all clinic IDs
  let allClinicIds = []

  // Add user's primary clinic
  if (userData?.clinic_id) {
    allClinicIds.push(userData.clinic_id)
  }

  // Add owned clinics
  if (ownedClinics) {
    ownedClinics.forEach(c => {
      if (c.clinic_uuid && !allClinicIds.includes(c.clinic_uuid)) {
        allClinicIds.push(c.clinic_uuid)
      }
    })
  }

  // Add membership clinics
  membershipClinicIds.forEach(clinicId => {
    if (clinicId && !allClinicIds.includes(clinicId)) {
      allClinicIds.push(clinicId)
    }
  })

  // Remove duplicates
  const uniqueClinicIds = [...new Set(allClinicIds)]
  
  console.log("getAllMyClinicIds - Final clinic IDs:", uniqueClinicIds)

  return uniqueClinicIds
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
