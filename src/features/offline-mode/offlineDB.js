import Dexie from 'dexie';

const DB_NAME = 'TabibiOfflineDB';
const DB_VERSION = 5; // Incremented version for Dexie migration

// Initialize Dexie database
export const db = new Dexie(DB_NAME);

// Define schema
db.version(DB_VERSION).stores({
  patients: 'id, clinic_id, name, phone, updated_at, is_deleted',
  appointments: 'id, clinic_id, patient_id, date, status, updated_at, is_deleted',
  visits: 'id, clinic_id, patient_id, updated_at, is_deleted',
  patient_plans: 'id, clinic_id, patient_id, template_id, updated_at, is_deleted',
  treatment_templates: 'id, clinic_id, name, updated_at, is_deleted',
  financial_records: 'id, clinic_id, patient_id, appointment_id, recorded_at, type, updated_at, is_deleted',
  notifications: 'id, clinic_id, is_read, created_at, updated_at, is_deleted',
  clinics: 'id, clinic_uuid, updated_at, is_deleted',
  user_preferences: 'id, user_id, updated_at, is_deleted',
  offline_queue: '++id, table, action, payload, timestamp, synced, seq, idempotency_key',
  settings: 'key'
});

// Helper functions for common operations
export const addItem = async (table, item) => {
  const enrichedItem = {
    ...item,
    updated_at: item.updated_at || new Date().toISOString(),
    is_deleted: item.is_deleted || false
  };
  return await db.table(table).add(enrichedItem);
};

export const getItem = async (table, id) => {
  return await db.table(table).get(id);
};

export const getItemOffline = async (table, id) => {
  console.log(`[OFFLINE_DB] getItemOffline from ${table} for id:`, id);
  // Dexie .get() works with both string and number IDs
  // Try directly first
  let item = await db.table(table).get(id);
  
  // If not found and id is a string but might be a number in DB
  if (!item && typeof id === 'string') {
    const numId = Number(id);
    if (!isNaN(numId)) {
      item = await db.table(table).get(numId);
    }
  }
  
  return item;
};

export const getAllItems = async (table) => {
  const all = await db.table(table).toArray();
  return all.filter(item => !item.is_deleted);
};

export const updateItem = async (table, id, changes) => {
  const enrichedChanges = {
    ...changes,
    updated_at: new Date().toISOString()
  };
  return await db.table(table).update(id, enrichedChanges);
};

export const deleteItem = async (table, id) => {
  // Soft delete by default for clinic data
  if (['settings', 'offline_queue'].includes(table)) {
    return await db.table(table).delete(id);
  }
  return await db.table(table).update(id, { is_deleted: true, updated_at: new Date().toISOString() });
};

export const clearStore = async (table) => {
  return await db.table(table).clear();
};

export const searchPatientsOffline = async (searchTerm) => {
  console.log("[OFFLINE_DB] searchPatientsOffline called with query:", searchTerm);
  const table = db.table(STORE_NAMES.PATIENTS);
  
  // Let's check total items first to debug
  const allInTable = await table.toArray();
  console.log("[OFFLINE_DB] Total records in patients table:", allInTable.length);
  
  // If we have items but none are showing, maybe is_deleted is causing issues
  const nonDeleted = allInTable.filter(p => !p.is_deleted);
  console.log("[OFFLINE_DB] Non-deleted records:", nonDeleted.length);

  if (!searchTerm) return nonDeleted;
  
  const lowerSearch = searchTerm.toLowerCase();
  return nonDeleted.filter(p => (
    (p.name && p.name.toLowerCase().includes(lowerSearch)) ||
    (p.phone && p.phone.includes(searchTerm))
  ));
};

export const getOfflineAppointments = async (filters = {}) => {
  const table = db.table(STORE_NAMES.APPOINTMENTS);
  const allInTable = await table.toArray();
  const nonDeleted = allInTable.filter(p => !p.is_deleted);
  
  let results = nonDeleted;
  
  if (filters.patient_id) {
    results = nonDeleted.filter(p => p.patient_id == filters.patient_id);
  }
  
  // Sort by date descending
  return results.sort((a, b) => new Date(b.date) - new Date(a.date));
};

export const getOfflineFinancialRecords = async (filters = {}) => {
  const table = db.table(STORE_NAMES.FINANCIAL_RECORDS);
  const allInTable = await table.toArray();
  const results = allInTable.filter(p => !p.is_deleted);
  return results.sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at));
};

export const getOfflinePatientStats = async (startDate) => {
  const table = db.table(STORE_NAMES.PATIENTS);
  const allInTable = await table.toArray();
  const allPatients = allInTable.filter(p => !p.is_deleted);
  
  const start = startDate ? new Date(startDate) : null;
  
  const stats = {
    totalCount: allPatients.length,
    maleCount: allPatients.filter(p => p.gender === 'male').length,
    femaleCount: allPatients.filter(p => p.gender === 'female').length,
    newCount: start ? allPatients.filter(p => new Date(p.created_at) >= start).length : 0
  };
  
  // Adapt to what getPatientStats returns (usually it's the object above or similar)
  return stats;
};

// Queue management
export const addToQueue = async (operation) => {
  const queueItem = {
    ...operation,
    timestamp: new Date().toISOString(),
    synced: 0,
    seq: Date.now(), // Simplified seq for now
    idempotency_key: crypto.randomUUID()
  };
  return await db.offline_queue.add(queueItem);
};

export const getUnsyncedItems = async () => {
  return await db.offline_queue
    .where('synced')
    .equals(0)
    .sortBy('seq');
};

export const markAsSynced = async (id) => {
  return await db.offline_queue.update(id, { synced: 1 });
};

export const removeFromQueue = async (id) => {
  return await db.offline_queue.delete(id);
};

// Settings
export const setSetting = async (key, value) => {
  return await db.settings.put({ key, value });
};

export const getSetting = async (key) => {
  const res = await db.settings.get(key);
  return res?.value;
};

// Export store names for consistency
export const STORE_NAMES = {
  PATIENTS: 'patients',
  APPOINTMENTS: 'appointments',
  VISITS: 'visits',
  PATIENT_PLANS: 'patient_plans',
  TREATMENT_TEMPLATES: 'treatment_templates',
  FINANCIAL_RECORDS: 'financial_records',
  NOTIFICATIONS: 'notifications',
  CLINICS: 'clinics',
  USER_PREFERENCES: 'user_preferences',
  OFFLINE_QUEUE: 'offline_queue',
  SETTINGS: 'settings'
};

export default db;
