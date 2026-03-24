import { openDB } from 'idb';
import { ensureDekWithPin, encryptJson, decryptJson } from './crypto';
import { getDeviceId, getNextSeq, getNowHlc, encodeHlc, makeIdempotencyKey } from './device';

const DB_NAME = 'TabibiOfflineDB';
const DB_VERSION = 4;

// Define store names
export const STORE_NAMES = {
  PATIENTS: 'patients',
  APPOINTMENTS: 'appointments',
  TREATMENT_PLANS: 'treatmentPlans',
  PRESCRIPTIONS: 'prescriptions',
  NOTIFICATIONS: 'notifications',
  FINANCIAL_RECORDS: 'financialRecords',
  OFFLINE_QUEUE: 'offlineQueue',
  SETTINGS: 'settings'
};

// Initialize the database
export async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains(STORE_NAMES.PATIENTS)) {
        const patientsStore = db.createObjectStore(STORE_NAMES.PATIENTS, { keyPath: 'id' });
        patientsStore.createIndex('clinic_id', 'clinic_id');
        patientsStore.createIndex('name', 'name');
        patientsStore.createIndex('phone', 'phone');
      }

      if (!db.objectStoreNames.contains(STORE_NAMES.APPOINTMENTS)) {
        const appointmentsStore = db.createObjectStore(STORE_NAMES.APPOINTMENTS, { keyPath: 'id' });
        appointmentsStore.createIndex('clinic_id', 'clinic_id');
        appointmentsStore.createIndex('patient_id', 'patient_id');
        appointmentsStore.createIndex('date', 'date');
        appointmentsStore.createIndex('status', 'status');
      }

      if (!db.objectStoreNames.contains(STORE_NAMES.TREATMENT_PLANS)) {
        const treatmentPlansStore = db.createObjectStore(STORE_NAMES.TREATMENT_PLANS, { keyPath: 'id' });
        treatmentPlansStore.createIndex('clinic_id', 'clinic_id');
        treatmentPlansStore.createIndex('patient_id', 'patient_id');
      }

      if (!db.objectStoreNames.contains(STORE_NAMES.PRESCRIPTIONS)) {
        const prescriptionsStore = db.createObjectStore(STORE_NAMES.PRESCRIPTIONS, { keyPath: 'id' });
        prescriptionsStore.createIndex('clinic_id', 'clinic_id');
        prescriptionsStore.createIndex('patient_id', 'patient_id');
        prescriptionsStore.createIndex('visit_id', 'visit_id');
      }

      if (!db.objectStoreNames.contains(STORE_NAMES.NOTIFICATIONS)) {
        const notificationsStore = db.createObjectStore(STORE_NAMES.NOTIFICATIONS, { keyPath: 'id' });
        notificationsStore.createIndex('clinic_id', 'clinic_id');
        notificationsStore.createIndex('is_read', 'is_read');
        notificationsStore.createIndex('created_at', 'created_at');
      }

      if (!db.objectStoreNames.contains(STORE_NAMES.FINANCIAL_RECORDS)) {
        const financialStore = db.createObjectStore(STORE_NAMES.FINANCIAL_RECORDS, { keyPath: 'id' });
        financialStore.createIndex('clinic_id', 'clinic_id');
        financialStore.createIndex('patient_id', 'patient_id');
        financialStore.createIndex('appointment_id', 'appointment_id');
        financialStore.createIndex('recorded_at', 'recorded_at');
        financialStore.createIndex('type', 'type');
        financialStore.createIndex('updated_at', 'updated_at');
      }

      if (!db.objectStoreNames.contains(STORE_NAMES.OFFLINE_QUEUE)) {
        const queueStore = db.createObjectStore(STORE_NAMES.OFFLINE_QUEUE, { keyPath: 'id', autoIncrement: true });
        queueStore.createIndex('timestamp', 'timestamp');
        queueStore.createIndex('synced', 'synced');
        queueStore.createIndex('entityType', 'entityType');
        queueStore.createIndex('seq', 'seq');
        queueStore.createIndex('idempotency_key', 'idempotency_key');
      }
      if (!db.objectStoreNames.contains(STORE_NAMES.SETTINGS)) {
        db.createObjectStore(STORE_NAMES.SETTINGS, { keyPath: 'key' });
      }
      if (oldVersion < 2) {
        try {
          const txn = db.transaction(STORE_NAMES.OFFLINE_QUEUE, 'versionchange');
          const store = txn.objectStore(STORE_NAMES.OFFLINE_QUEUE);
          if (!store.indexNames.contains('seq')) store.createIndex('seq', 'seq');
          if (!store.indexNames.contains('idempotency_key')) store.createIndex('idempotency_key', 'idempotency_key');
        } catch {}
      }
    }
  });
}

// Get database instance
export async function getDB() {
  return initDB();
}

function getPin() {
  const p = sessionStorage.getItem('tabibi_pin') || ''
  return p || 'tabibi'
}

export async function addItem(storeName, item) {
  const db = await getDB();
  try {
    await ensureDekWithPin(getPin());
    const enc = await encryptJson(item, getPin());
    const toStore = enc && item && typeof item === 'object' && item.id
      ? { ...enc, id: item.id }
      : (enc || item);
    console.log("[OFFLINE_DB] addItem", { storeName, id: item?.id, encrypted: !!enc });
    return db.add(storeName, toStore);
  } catch {
    console.log("[OFFLINE_DB] addItem (unencrypted fallback)", { storeName, id: item?.id });
    return db.add(storeName, item);
  }
}

export async function getItem(storeName, key) {
  const db = await getDB();
  const v = await db.get(storeName, key);
  if (!v) return v;
  if (v.__enc) {
    try {
      const dec = await decryptJson(v, getPin());
      return dec || v;
    } catch {
      return v;
    }
  }
  return v;
}

export async function getAllItems(storeName) {
  const db = await getDB();
  const arr = await db.getAll(storeName);
  const out = [];
  for (const v of arr) {
    if (v && v.__enc) {
      try {
        const dec = await decryptJson(v, getPin());
        out.push(dec || v);
      } catch {
        out.push(v);
      }
    } else {
      out.push(v);
    }
  }
  return out;
}

export async function updateItem(storeName, key, item) {
  const db = await getDB();
  try {
    await ensureDekWithPin(getPin());
    const enc = await encryptJson(item, getPin());
    const toStore = enc
      ? { ...enc, id: (item && typeof item === 'object' && item.id) ? item.id : key }
      : item;
    return db.put(storeName, toStore);
  } catch {
    return db.put(storeName, item);
  }
}

export async function deleteItem(storeName, key) {
  const db = await getDB();
  return db.delete(storeName, key);
}

export async function clearStore(storeName) {
  const db = await getDB();
  return db.clear(storeName);
}

export async function searchPatientsOffline(searchTerm) {
  const allPatients = await getAllItems(STORE_NAMES.PATIENTS);
  if (!searchTerm || searchTerm.trim() === '') return allPatients;

  const q = searchTerm.toLowerCase();
  return allPatients.filter((patient) => {
    const nameMatch = patient?.name && String(patient.name).toLowerCase().includes(q);
    const phoneMatch = patient?.phone && String(patient.phone).includes(searchTerm);
    return nameMatch || phoneMatch;
  });
}

export async function addToQueue(operation) {
  const db = await getDB();
  const timestamp = new Date().toISOString();
  const deviceId = getDeviceId();
  const seq = getNextSeq();
  const hlc = encodeHlc(getNowHlc());
  const derivedEntityType = operation?.entityType || (operation?.table
    ? ({
      patients: 'patient',
      appointments: 'appointment',
      patient_plans: 'treatmentPlan',
      financial_records: 'financialRecord'
    })[operation.table] || operation.table
    : null);
  const derivedOperation = operation?.operation || operation?.action;
  const idempotency_key = makeIdempotencyKey({
    deviceId,
    seq,
    entityType: derivedEntityType || '',
    entityId: operation.entityId || operation.id || '',
    tempId: operation.localId || ''
  });
  
  const queueItem = {
    ...operation,
    entityType: derivedEntityType || operation?.entityType,
    operation: derivedOperation || operation?.operation,
    timestamp,
    synced: 0,
    device_id: deviceId,
    seq,
    hlc,
    idempotency_key
  };
  console.log("[OFFLINE_DB] addToQueue start", { entityType: operation?.entityType, operation: operation?.operation, entityId: operation?.entityId, localId: operation?.localId, seq });
  const key = await db.add(STORE_NAMES.OFFLINE_QUEUE, queueItem);
  try {
    await db.put(STORE_NAMES.OFFLINE_QUEUE, { ...queueItem, id: key });
  } catch {}
  console.log("[OFFLINE_DB] addToQueue done", { queueId: key });
  return key;
}

export async function getUnsyncedItems() {
  const db = await getDB();
  const tx = db.transaction(STORE_NAMES.OFFLINE_QUEUE, 'readonly');
  const store = tx.objectStore(STORE_NAMES.OFFLINE_QUEUE);
  try {
    const index = store.index('synced');
    const res = await index.getAll(0);
    if (Array.isArray(res) && res.length > 0) {
      return res.slice().sort((a, b) => {
        const as = Number(a?.seq)
        const bs = Number(b?.seq)
        if (Number.isFinite(as) && Number.isFinite(bs) && as !== bs) return as - bs
        return String(a?.timestamp || "").localeCompare(String(b?.timestamp || ""))
      });
    }
  } catch {}

  const all = await store.getAll();
  return (all || [])
    .filter((it) => it?.synced === 0 || it?.synced === false || it?.synced == null || it?.synced === "false")
    .sort((a, b) => {
      const as = Number(a?.seq)
      const bs = Number(b?.seq)
      if (Number.isFinite(as) && Number.isFinite(bs) && as !== bs) return as - bs
      return String(a?.timestamp || "").localeCompare(String(b?.timestamp || ""))
    });
}

export async function markAsSynced(queueId) {
  const db = await getDB();
  const tx = db.transaction(STORE_NAMES.OFFLINE_QUEUE, 'readwrite');
  const store = tx.objectStore(STORE_NAMES.OFFLINE_QUEUE);
  
  const item = await store.get(queueId);
  if (item) {
    item.synced = 1;
    await store.put(item);
  }
  
  return tx.done;
}

export async function removeFromQueue(queueId) {
  const db = await getDB();
  return db.delete(STORE_NAMES.OFFLINE_QUEUE, queueId);
}

export async function setSetting(key, value) {
  const db = await getDB();
  return db.put(STORE_NAMES.SETTINGS, { key, value });
}

export async function getSetting(key) {
  const db = await getDB();
  const row = await db.get(STORE_NAMES.SETTINGS, key);
  return row?.value;
}
