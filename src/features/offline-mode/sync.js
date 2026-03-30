import supabase from '../../services/supabase'
import { getItem, updateItem, getUnsyncedItems, removeFromQueue, STORE_NAMES } from './offlineDB'
import { resolveClinicIdentifiers } from '../../services/clinicIds'

const isDev = import.meta.env.DEV

function mapEntityType(table) {
  if (!table) return null
  const t = String(table)
  if (t === 'patients') return 'patient'
  if (t === 'appointments') return 'appointment'
  if (t === 'patient_plans') return 'treatmentPlan'
  if (t === 'financial_records') return 'financialRecord'
  return t
}

function parseTime(v) {
  const n = Date.parse(String(v || ""))
  return Number.isFinite(n) ? n : null
}

async function yieldToMain() {
  await new Promise((r) => setTimeout(r, 0))
}

async function upsertIfServerNewer(storeName, row) {
  const local = await getItem(storeName, row.id)
  const localTs = parseTime(local?.updated_at) ?? parseTime(local?.local_updated_at) ?? parseTime(local?.local_created_at)
  const serverTs = parseTime(row?.updated_at) ?? parseTime(row?.created_at)
  if (localTs != null && serverTs != null && localTs > serverTs) return false
  await updateItem(storeName, row.id, row)
  return true
}

export async function syncQueuedOperations() {
  if (isDev) console.groupCollapsed("[OFFLINE_SYNC] syncQueuedOperations");
  const items = await getUnsyncedItems()
  if (isDev) console.log("[OFFLINE_SYNC] unsyncedItems:", items?.length || 0)
  if (!items || items.length === 0) {
    if (isDev) console.groupEnd()
    return { synced: 0, failed: 0 }
  }
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    if (isDev) console.warn("[OFFLINE_SYNC] no session, cannot sync")
    if (isDev) console.groupEnd()
    throw new Error('Not authenticated')
  }
  const events = items.map(it => {
    const entity_type = it.entityType || mapEntityType(it.table)
    const op = it.operation || it.action || it.op
    const payload = it.data || it.payload || {}
    const entity_id = it.entityId || it.entity_id || null
    const temp_id = it.localId || it.temp_id || null
    return {
      id: it.id,
      device_id: it.device_id,
      seq: it.seq,
      hlc: it.hlc,
      entity_type,
      op,
      entity_id,
      temp_id,
      payload,
      idempotency_key: it.idempotency_key
    }
  })
  const payload = {
    events
  }
  if (isDev) console.log("[OFFLINE_SYNC] invoke ingest-events", { events: payload.events.length })
  const withTimeout = async (p, ms, label) => {
    let t
    const timeout = new Promise((_, rej) => {
      t = setTimeout(() => rej(new Error(label || 'Network timeout')), ms)
    })
    try {
      return await Promise.race([p, timeout])
    } finally {
      clearTimeout(t)
    }
  }

  const res = await withTimeout(
    supabase.functions.invoke('ingest-event', { body: payload }),
    15000,
    'Sync timeout'
  )
  if (res.error) {
    if (isDev) console.error("[OFFLINE_SYNC] ingest-event error", res.error)
    if (isDev) console.groupEnd()
    throw new Error(res.error.message || 'ingest-event failed')
  }

  const appliedIds = res.data?.applied_ids || []
  if (isDev) console.log("[OFFLINE_SYNC] appliedIds from server:", appliedIds)

  const okIds = new Set(appliedIds.map(id => Number(id)))
  let ok = 0
  for (const it of items) {
    // Check both as numbers to avoid type mismatch
    if (okIds.has(Number(it.id))) {
      await removeFromQueue(it.id)
      ok++
    }
  }
  
  const result = { synced: ok, failed: items.length - ok }
  if (isDev) {
    console.log("[OFFLINE_SYNC] result", result)
    if (result.failed > 0) {
      console.warn("[OFFLINE_SYNC] some items failed to sync. Check Supabase Edge Function logs.")
    }
  }
  if (isDev) console.groupEnd()
  return result
}

export async function syncAllDataToLocal() {
  if (isDev) console.groupCollapsed("[FULL_SYNC] syncAllDataToLocal");
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    if (isDev) console.warn("[FULL_SYNC] no session");
    if (isDev) console.groupEnd();
    return { success: false, error: "Not authenticated" };
  }
  const { clinicUuid, clinicIdBigint } = await resolveClinicIdentifiers()

  let synced = 0;
  let failed = 0;

  try {
    const [patientsRes, appointmentsRes, plansRes, financialRes] = await Promise.all([
      supabase.from("patients").select("*").eq("clinic_id", clinicUuid),
      supabase.from("appointments").select("*").eq("clinic_id", clinicUuid),
      supabase.from("patient_plans").select("*").eq("clinic_id", clinicUuid),
      supabase.from("financial_records").select("*").eq("clinic_id", clinicIdBigint),
    ]);

    if (patientsRes.data) {
      let i = 0
      for (const p of patientsRes.data) {
        try { if (await upsertIfServerNewer(STORE_NAMES.PATIENTS, p)) synced++; } catch { failed++; }
        i++
        if (i % 50 === 0) await yieldToMain()
      }
      if (isDev) console.log("[FULL_SYNC] patients:", patientsRes.data.length);
    }

    if (appointmentsRes.data) {
      let i = 0
      for (const a of appointmentsRes.data) {
        try { if (await upsertIfServerNewer(STORE_NAMES.APPOINTMENTS, a)) synced++; } catch { failed++; }
        i++
        if (i % 50 === 0) await yieldToMain()
      }
      if (isDev) console.log("[FULL_SYNC] appointments:", appointmentsRes.data.length);
    }

    if (plansRes.data) {
      let i = 0
      for (const t of plansRes.data) {
        try { if (await upsertIfServerNewer(STORE_NAMES.TREATMENT_PLANS, t)) synced++; } catch { failed++; }
        i++
        if (i % 50 === 0) await yieldToMain()
      }
      if (isDev) console.log("[FULL_SYNC] patient_plans:", plansRes.data.length);
    }

    if (financialRes.data) {
      let i = 0
      for (const r of financialRes.data) {
        try { if (await upsertIfServerNewer(STORE_NAMES.FINANCIAL_RECORDS, r)) synced++; } catch { failed++; }
        i++
        if (i % 50 === 0) await yieldToMain()
      }
      if (isDev) console.log("[FULL_SYNC] financial_records:", financialRes.data.length);
    }

    if (isDev) console.log("[FULL_SYNC] result", { synced, failed });
    if (isDev) console.groupEnd();
    return { success: true, synced, failed };
  } catch (e) {
    if (isDev) console.error("[FULL_SYNC] error:", e);
    if (isDev) console.groupEnd();
    return { success: false, error: e.message };
  }
}
