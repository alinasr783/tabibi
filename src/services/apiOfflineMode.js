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

/**
 * Checks if the application should behave in offline mode.
 */
export function shouldUseOfflineMode() {
  const offlineEnabled = localStorage.getItem("tabibi_offline_enabled") === "true";
  const browserOffline = typeof navigator !== "undefined" && navigator.onLine === false;
  
  // We use offline mode if:
  // 1. User explicitly enabled it AND browser is offline
  // 2. OR User explicitly enabled it (some users might want to work locally even with net)
  // For now, let's stick to "Enabled AND Offline" to avoid blocking cloud sync if net is available.
  // BUT, we should also return true if a previous request failed with a network error.
  
  return offlineEnabled && browserOffline;
}

/**
 * Gets the current clinic ID from cache or Supabase.
 * This is a critical helper to avoid network requests when offline.
 */
export async function getClinicId() {
  // 1. Check cache first (localStorage is fast and works offline)
  const cachedId = localStorage.getItem("tabibi_clinic_id");
  
  // 2. If we are offline or have a cache, return it
  const isOffline = shouldUseOfflineMode();
  if (isOffline && cachedId) {
    return cachedId;
  }

  // 3. If online and no cache, or if we want to refresh, fetch from Supabase
  // Note: We only do this if we are NOT in offline mode
  if (!isOffline) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: userData } = await supabase
          .from("users")
          .select("clinic_id")
          .eq("user_id", session.user.id)
          .single();
        
        if (userData?.clinic_id) {
          localStorage.setItem("tabibi_clinic_id", userData.clinic_id);
          return userData.clinic_id;
        }
      }
    } catch (e) {
      console.error("Failed to fetch clinic_id from server:", e);
    }
  }

  // 4. Final fallback to cache even if online (if fetch failed)
  return cachedId;
}
