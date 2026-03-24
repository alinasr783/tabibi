import supabase from "./supabase"

export async function resolveClinicIdentifiers() {
  try {
    const cachedUuid = localStorage.getItem("tabibi_clinic_id")
    const cachedBigint = localStorage.getItem("tabibi_clinic_id_bigint")
    if (cachedUuid && cachedBigint) {
      const n = Number(cachedBigint)
      if (Number.isFinite(n)) return { clinicUuid: cachedUuid, clinicIdBigint: n }
    }
  } catch {}

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Not authenticated")

  const { data: userData, error: userErr } = await supabase
    .from("users")
    .select("clinic_id, clinic_id_bigint")
    .eq("user_id", session.user.id)
    .single()

  if (userErr) throw new Error(userErr.message || "Failed to load clinic identifiers")
  if (!userData?.clinic_id) throw new Error("User has no clinic assigned")

  const clinicUuid = userData.clinic_id
  let clinicIdBigint = userData.clinic_id_bigint

  if (!clinicIdBigint) {
    const { data: clinicRow, error: clinicErr } = await supabase
      .from("clinics")
      .select("clinic_id_bigint, id")
      .eq("clinic_uuid", clinicUuid)
      .single()
    if (clinicErr) throw new Error(clinicErr.message || "Failed to load clinic bigint id")
    clinicIdBigint = clinicRow?.clinic_id_bigint || clinicRow?.id || null
  }

  if (!clinicIdBigint) throw new Error("User has no clinic assigned")

  try {
    localStorage.setItem("tabibi_clinic_id", clinicUuid)
    localStorage.setItem("tabibi_clinic_id_bigint", String(clinicIdBigint))
  } catch {}

  return { clinicUuid, clinicIdBigint }
}

export async function resolveClinicUuid() {
  const { clinicUuid } = await resolveClinicIdentifiers()
  return clinicUuid
}

export async function resolveClinicIdBigint() {
  const { clinicIdBigint } = await resolveClinicIdentifiers()
  return clinicIdBigint
}

