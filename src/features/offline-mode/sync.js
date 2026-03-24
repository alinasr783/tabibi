import supabase from '../../services/supabase'
import { getItem, updateItem, getUnsyncedItems, removeFromQueue, STORE_NAMES } from './offlineDB'
import { resolveClinicIdentifiers } from '../../services/clinicIds'

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

async function upsertIfServerNewer(storeName, row) {
  const local = await getItem(storeName, row.id)
  const localTs = parseTime(local?.updated_at) ?? parseTime(local?.local_updated_at) ?? parseTime(local?.local_created_at)
  const serverTs = parseTime(row?.updated_at) ?? parseTime(row?.created_at)
  if (localTs != null && serverTs != null && localTs > serverTs) return false
  await updateItem(storeName, row.id, row)
  return true
}

export async function syncQueuedOperations() {
  console.groupCollapsed("[OFFLINE_SYNC] syncQueuedOperations");
  const items = await getUnsyncedItems()
  console.log("[OFFLINE_SYNC] unsyncedItems:", items?.length || 0)
  if (!items || items.length === 0) {
    console.groupEnd()
    return { synced: 0, failed: 0 }
  }
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    console.warn("[OFFLINE_SYNC] no session, cannot sync")
    console.groupEnd()
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
  console.log("[OFFLINE_SYNC] invoke ingest-events", { events: payload.events.length })
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
    supabase.functions.invoke('ingest-events', { body: payload }),
    12000,
    'Sync timeout'
  )
  if (res.error) {
    console.error("[OFFLINE_SYNC] ingest-events error", res.error)
    console.groupEnd()
    throw new Error(res.error.message || 'ingest-events failed')
  }
  const okIds = new Set((res.data && res.data.applied_ids) || items.map(i => i.id))
  let ok = 0
  for (const it of items) {
    if (okIds.has(it.id)) {
      await removeFromQueue(it.id)
      ok++
    }
  }
  const result = { synced: ok, failed: items.length - ok }
  console.log("[OFFLINE_SYNC] result", result)
  console.groupEnd()
  return result
}

export async function syncAllDataToLocal() {
  console.groupCollapsed("[FULL_SYNC] syncAllDataToLocal");
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    console.warn("[FULL_SYNC] no session");
    console.groupEnd();
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
      for (const p of patientsRes.data) {
        try { if (await upsertIfServerNewer(STORE_NAMES.PATIENTS, p)) synced++; } catch { failed++; }
      }
      console.log("[FULL_SYNC] patients:", patientsRes.data.length);
    }

    if (appointmentsRes.data) {
      for (const a of appointmentsRes.data) {
        try { if (await upsertIfServerNewer(STORE_NAMES.APPOINTMENTS, a)) synced++; } catch { failed++; }
      }
      console.log("[FULL_SYNC] appointments:", appointmentsRes.data.length);
    }

    if (plansRes.data) {
      for (const t of plansRes.data) {
        try { if (await upsertIfServerNewer(STORE_NAMES.TREATMENT_PLANS, t)) synced++; } catch { failed++; }
      }
      console.log("[FULL_SYNC] patient_plans:", plansRes.data.length);
    }

    if (financialRes.data) {
      for (const r of financialRes.data) {
        try { if (await upsertIfServerNewer(STORE_NAMES.FINANCIAL_RECORDS, r)) synced++; } catch { failed++; }
      }
      console.log("[FULL_SYNC] financial_records:", financialRes.data.length);
    }

    console.log("[FULL_SYNC] result", { synced, failed });
    console.groupEnd();
    return { success: true, synced, failed };
  } catch (e) {
    console.error("[FULL_SYNC] error:", e);
    console.groupEnd();
    return { success: false, error: e.message };
  }
}
