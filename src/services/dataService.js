import supabase from "./supabase"
import { STORE_NAMES, addItem, updateItem, deleteItem, getAllItems, addToQueue } from "../features/offline-mode/offlineDB"
import { shouldUseOfflineMode } from "./apiOfflineMode"
import { saveToLocalFolder } from "./fileSystemStorage"

async function mirrorToLocalFolder(store, table) {
  try {
    const items = await getAllItems(store);
    await saveToLocalFolder(`${table}.json`, items);
  } catch (e) {
    console.error(`Failed to mirror ${table} to local folder:`, e);
  }
}

function mapStore(table) {
  if (table === "patients") return STORE_NAMES.PATIENTS
  if (table === "appointments") return STORE_NAMES.APPOINTMENTS
  if (table === "patient_plans") return STORE_NAMES.TREATMENT_PLANS
  if (table === "financial_records") return STORE_NAMES.FINANCIAL_RECORDS
  if (table === "visits") return STORE_NAMES.VISITS
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
  const useOffline = shouldUseOfflineMode()
  const store = mapStore(table)

  if (useOffline && store) {
    const localId = makeLocalId()
    const nowIso = new Date().toISOString()
    const row = { ...data, id: localId, updated_at: data?.updated_at || nowIso, local_created_at: nowIso }
    await addItem(store, row)
    await addToQueue({ table, action: "create", data: row, localId })
    await mirrorToLocalFolder(store, table)
    return row
  }

  const { data: inserted, error } = await supabase.from(table).insert(data).select().single()
  if (error) throw error

  if (store) {
    try { 
      await updateItem(store, inserted.id, inserted) 
      await mirrorToLocalFolder(store, table)
    } catch {}
  }

  return inserted
}

export async function update(table, id, data) {
  const useOffline = shouldUseOfflineMode()
  const store = mapStore(table)

  if (useOffline && store) {
    const nowIso = new Date().toISOString()
    const row = { ...data, id, updated_at: data?.updated_at || nowIso, local_updated_at: nowIso }
    await updateItem(store, id, row)
    await addToQueue({ table, action: "update", entityId: id, data: row })
    await mirrorToLocalFolder(store, table)
    return row
  }

  const { data: updated, error } = await supabase.from(table).update(data).eq("id", id.toString()).select().single()
  if (error) throw error

  if (store) {
    try { 
      await updateItem(store, updated.id, updated) 
      await mirrorToLocalFolder(store, table)
    } catch {}
  }

  return updated
}

export async function remove(table, id) {
  const useOffline = shouldUseOfflineMode()
  const store = mapStore(table)

  if (useOffline && store) {
    await deleteItem(store, id)
    await addToQueue({ table, action: "delete", entityId: id })
    await mirrorToLocalFolder(store, table)
    return { success: true }
  }

  const { error } = await supabase.from(table).delete().eq("id", id.toString())
  if (error) throw error

  if (store) {
    try { 
      await deleteItem(store, id) 
      await mirrorToLocalFolder(store, table)
    } catch {}
  }

  return { success: true }
}

export async function get(table, filters = {}) {
  const useOffline = shouldUseOfflineMode()
  const store = mapStore(table)

  if (useOffline && store) {
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

  if (store && Array.isArray(data)) {
    for (const row of data) {
      try { await updateItem(store, row.id, row) } catch {}
    }
    await mirrorToLocalFolder(store, table)
  }

  return data ?? []
}

