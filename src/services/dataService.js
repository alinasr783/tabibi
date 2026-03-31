import supabase from "./supabase"
import { STORE_NAMES, addItem, updateItem, deleteItem, getAllItems, addToQueue } from "../features/offline-mode/offlineDB"

function isOfflineEnabled() {
  try { return localStorage.getItem("tabibi_offline_enabled") === "true" } catch { return false }
}

function isOnlineNow() {
  return typeof navigator !== "undefined" ? navigator.onLine !== false : true
}

function mapStore(table) {
  if (table === "patients") return STORE_NAMES.PATIENTS
  if (table === "appointments") return STORE_NAMES.APPOINTMENTS
  if (table === "patient_plans") return STORE_NAMES.TREATMENT_PLANS
  if (table === "financial_records") return STORE_NAMES.FINANCIAL_RECORDS
  return null
}

function makeLocalId() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

function applyEqFilters(items, filters) {
  const f = filters && typeof filters === "object" ? filters : {}
  const keys = Object.keys(f).filter((k) => f[k] !== undefined)
  if (keys.length === 0) return items
  return (items || []).filter((row) => keys.every((k) => row?.[k] == f[k]))
}

export async function create(table, data) {
  const enabled = isOfflineEnabled()
  const online = isOnlineNow()
  const store = mapStore(table)

  if (enabled && !online && store) {
    const localId = makeLocalId()
    const nowIso = new Date().toISOString()
    const row = { ...data, id: localId, updated_at: data?.updated_at || nowIso, local_created_at: nowIso }
    await addItem(store, row)
    await addToQueue({ table, action: "create", data: row, localId })
    return row
  }

  const { data: inserted, error } = await supabase.from(table).insert(data).select().single()
  if (error) throw error

  if (enabled && store) {
    try { await updateItem(store, inserted.id, inserted) } catch {}
  }

  return inserted
}

export async function update(table, id, data) {
  const enabled = isOfflineEnabled()
  const online = isOnlineNow()
  const store = mapStore(table)

  if (enabled && !online && store) {
    const nowIso = new Date().toISOString()
    const row = { ...data, id, updated_at: data?.updated_at || nowIso, local_updated_at: nowIso }
    await updateItem(store, id, row)
    await addToQueue({ table, action: "update", entityId: id, data: row })
    return row
  }

  const { data: updated, error } = await supabase.from(table).update(data).eq("id", id.toString()).select().single()
  if (error) throw error

  if (enabled && store) {
    try { await updateItem(store, updated.id, updated) } catch {}
  }

  return updated
}

export async function remove(table, id) {
  const enabled = isOfflineEnabled()
  const online = isOnlineNow()
  const store = mapStore(table)

  if (enabled && !online && store) {
    await deleteItem(store, id)
    await addToQueue({ table, action: "delete", entityId: id })
    return { success: true }
  }

  const { error } = await supabase.from(table).delete().eq("id", id.toString())
  if (error) throw error

  if (enabled && store) {
    try { await deleteItem(store, id) } catch {}
  }

  return { success: true }
}

export async function get(table, filters = {}) {
  const enabled = isOfflineEnabled()
  const online = isOnlineNow()
  const store = mapStore(table)

  if (enabled && !online && store) {
    const all = await getAllItems(store)
    return applyEqFilters(all, filters)
  }

  let query = supabase.from(table).select("*")
  for (const [k, v] of Object.entries(filters || {})) {
    if (v === undefined) continue
    query = query.eq(k, v)
  }
  const { data, error } = await query
  if (error) throw error

  if (enabled && store && Array.isArray(data)) {
    for (const row of data) {
      try { await updateItem(store, row.id, row) } catch {}
    }
  }

  return data ?? []
}

