import supabase from "./supabase"

export async function getAppointmentTypes() {
  const { data, error } = await supabase
    .from("appointment_types")
    .select("*")
    .order("created_at", { ascending: true })

  if (error) {
    console.error("getAppointmentTypes error:", error)
    return []
  }
  return data || []
}

export async function createAppointmentType({ name, color }) {
  const { data, error } = await supabase
    .from("appointment_types")
    .insert([{ name, color }])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateAppointmentType(id, { name, color }) {
  const { data, error } = await supabase
    .from("appointment_types")
    .update({ name, color, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteAppointmentType(id) {
  const { error } = await supabase
    .from("appointment_types")
    .delete()
    .eq("id", id)

  if (error) throw error
  return true
}

export async function getAppointmentTypeById(id) {
  const { data, error } = await supabase
    .from("appointment_types")
    .select("*")
    .eq("id", id)
    .single()

  if (error) return null
  return data
}