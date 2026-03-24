import { useCallback } from 'react';
import { useOffline } from './OfflineContext';
import { 
  STORE_NAMES, 
  addItem, 
  updateItem, 
  deleteItem, 
  getItem, 
  getAllItems,
  searchPatientsOffline,
  addToQueue
} from './offlineDB';

export function useOfflineData() {
  // Add a try-catch block to handle cases where the hook is used outside the provider
  let isOfflineMode = false;
  let offlineEnabled = false;
  let hasOfflineContext = false;
  
  try {
    const offlineContext = useOffline();
    isOfflineMode = offlineContext.isOfflineMode;
    offlineEnabled = !!offlineContext.offlineEnabled;
    hasOfflineContext = true;
  } catch (error) {
    // If we're outside the OfflineProvider, we'll default to online mode
    console.warn("useOfflineData used outside OfflineProvider, defaulting to online mode");
  }
  const localOfflineEnabled = (() => {
    try { return localStorage.getItem("tabibi_offline_enabled") === "true" } catch { return false }
  })()
  const canUseOffline = (hasOfflineContext ? offlineEnabled : localOfflineEnabled)

  // Patient operations
  const createPatientOffline = useCallback(async (patientData) => {
    const browserOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (!canUseOffline) return null;
    if (!hasOfflineContext && !browserOffline) return null;

    try {
      const keys = patientData && typeof patientData === "object" ? Object.keys(patientData).sort() : [];
      console.groupCollapsed("[PATIENT_CREATE] createPatientOffline");
      console.log("[PATIENT_CREATE] createPatientOffline keys:", keys);
      const cachedClinicId = (() => {
        try { return localStorage.getItem("tabibi_clinic_id"); } catch { return null; }
      })();
      const clinic_id = patientData?.clinic_id || cachedClinicId || null;
      console.log("[PATIENT_CREATE] clinic_id:", clinic_id ? String(clinic_id).slice(0, 8) : null);
      // Generate a temporary local ID
      const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log("[PATIENT_CREATE] generated localId:", localId);
      const patientWithLocalId = {
        ...patientData,
        clinic_id,
        id: localId,
        local_created_at: new Date().toISOString()
      };

      // Save to local database
      console.log("[PATIENT_CREATE] addItem(patients) start");
      await addItem(STORE_NAMES.PATIENTS, patientWithLocalId);
      console.log("[PATIENT_CREATE] addItem(patients) done");

      // Add to offline queue for sync when online
      console.log("[PATIENT_CREATE] addToQueue(patient.create) start");
      await addToQueue({
        table: "patients",
        action: "create",
        data: { ...patientData, clinic_id },
        localId: localId
      });
      console.log("[PATIENT_CREATE] addToQueue(patient.create) done");

      return patientWithLocalId;
    } catch (error) {
      console.error('Error creating patient offline:', error);
      throw error;
    } finally {
      try { console.groupEnd(); } catch {}
    }
  }, [canUseOffline, hasOfflineContext, isOfflineMode]);

  const updatePatientOffline = useCallback(async (id, patientData) => {
    const browserOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (!canUseOffline) return null;
    if (!hasOfflineContext && !browserOffline) return null;

    try {
      const updatedPatient = {
        ...patientData,
        id,
        local_updated_at: new Date().toISOString()
      };

      // Update in local database
      await updateItem(STORE_NAMES.PATIENTS, id, updatedPatient);

      // Add to offline queue for sync when online
      await addToQueue({
        table: "patients",
        action: "update",
        entityId: id,
        data: patientData
      });

      return updatedPatient;
    } catch (error) {
      console.error('Error updating patient offline:', error);
      throw error;
    }
  }, [canUseOffline, hasOfflineContext, isOfflineMode]);

  const deletePatientOffline = useCallback(async (id) => {
    const browserOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (!canUseOffline) return null;
    if (!hasOfflineContext && !browserOffline) return null;

    try {
      // Delete from local database
      await deleteItem(STORE_NAMES.PATIENTS, id);

      // Add to offline queue for sync when online
      await addToQueue({
        table: "patients",
        action: "delete",
        entityId: id
      });
    } catch (error) {
      console.error('Error deleting patient offline:', error);
      throw error;
    }
  }, [canUseOffline, hasOfflineContext, isOfflineMode]);

  // Appointment operations
  const createAppointmentOffline = useCallback(async (appointmentData) => {
    const browserOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (!canUseOffline) return null;
    if (!hasOfflineContext && !browserOffline) return null;

    try {
      const cachedClinicId = (() => {
        try { return localStorage.getItem("tabibi_clinic_id"); } catch { return null; }
      })();
      const clinic_id = appointmentData?.clinic_id || cachedClinicId || null;
      // Generate a temporary local ID
      const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const appointmentWithLocalId = {
        ...appointmentData,
        clinic_id,
        id: localId,
        local_created_at: new Date().toISOString()
      };

      // Save to local database
      await addItem(STORE_NAMES.APPOINTMENTS, appointmentWithLocalId);

      // Add to offline queue for sync when online
      await addToQueue({
        table: "appointments",
        action: "create",
        data: { ...appointmentData, clinic_id },
        localId: localId
      });

      return appointmentWithLocalId;
    } catch (error) {
      console.error('Error creating appointment offline:', error);
      throw error;
    }
  }, [canUseOffline, hasOfflineContext, isOfflineMode]);

  const updateAppointmentOffline = useCallback(async (id, appointmentData) => {
    const browserOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (!canUseOffline) return null;
    if (!hasOfflineContext && !browserOffline) return null;

    try {
      const updatedAppointment = {
        ...appointmentData,
        id,
        local_updated_at: new Date().toISOString()
      };

      // Update in local database
      await updateItem(STORE_NAMES.APPOINTMENTS, id, updatedAppointment);

      // Add to offline queue for sync when online
      await addToQueue({
        table: "appointments",
        action: "update",
        entityId: id,
        data: appointmentData
      });

      return updatedAppointment;
    } catch (error) {
      console.error('Error updating appointment offline:', error);
      throw error;
    }
  }, [canUseOffline, hasOfflineContext, isOfflineMode]);

  const deleteAppointmentOffline = useCallback(async (id) => {
    const browserOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (!canUseOffline) return null;
    if (!hasOfflineContext && !browserOffline) return null;

    try {
      // Delete from local database
      await deleteItem(STORE_NAMES.APPOINTMENTS, id);

      // Add to offline queue for sync when online
      await addToQueue({
        table: "appointments",
        action: "delete",
        entityId: id
      });
    } catch (error) {
      console.error('Error deleting appointment offline:', error);
      throw error;
    }
  }, [canUseOffline, hasOfflineContext, isOfflineMode]);

  // Treatment Plan operations
  const createTreatmentPlanOffline = useCallback(async (treatmentPlanData) => {
    const browserOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (!canUseOffline) return null;
    if (!hasOfflineContext && !browserOffline) return null;

    try {
      // Generate a temporary local ID
      const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const treatmentPlanWithLocalId = {
        ...treatmentPlanData,
        id: localId,
        local_created_at: new Date().toISOString()
      };

      // Save to local database
      await addItem(STORE_NAMES.TREATMENT_PLANS, treatmentPlanWithLocalId);

      // Add to offline queue for sync when online
      await addToQueue({
        table: "patient_plans",
        action: "create",
        data: treatmentPlanData,
        localId: localId
      });

      return treatmentPlanWithLocalId;
    } catch (error) {
      console.error('Error creating treatment plan offline:', error);
      throw error;
    }
  }, [canUseOffline, hasOfflineContext, isOfflineMode]);

  const updateTreatmentPlanOffline = useCallback(async (id, treatmentPlanData) => {
    const browserOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (!canUseOffline) return null;
    if (!hasOfflineContext && !browserOffline) return null;

    try {
      const updatedTreatmentPlan = {
        ...treatmentPlanData,
        id,
        local_updated_at: new Date().toISOString()
      };

      // Update in local database
      await updateItem(STORE_NAMES.TREATMENT_PLANS, id, updatedTreatmentPlan);

      // Add to offline queue for sync when online
      await addToQueue({
        table: "patient_plans",
        action: "update",
        entityId: id,
        data: treatmentPlanData
      });

      return updatedTreatmentPlan;
    } catch (error) {
      console.error('Error updating treatment plan offline:', error);
      throw error;
    }
  }, [canUseOffline, hasOfflineContext, isOfflineMode]);

  const deleteTreatmentPlanOffline = useCallback(async (id) => {
    const browserOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (!canUseOffline) return null;
    if (!hasOfflineContext && !browserOffline) return null;

    try {
      // Delete from local database
      await deleteItem(STORE_NAMES.TREATMENT_PLANS, id);

      // Add to offline queue for sync when online
      await addToQueue({
        table: "patient_plans",
        action: "delete",
        entityId: id
      });
    } catch (error) {
      console.error('Error deleting treatment plan offline:', error);
      throw error;
    }
  }, [canUseOffline, hasOfflineContext, isOfflineMode]);

  const createFinancialRecordOffline = useCallback(async (recordData) => {
    const browserOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (!canUseOffline) return null;
    if (!hasOfflineContext && !browserOffline) return null;

    const cachedClinicIdBigint = (() => {
      try { return localStorage.getItem("tabibi_clinic_id_bigint"); } catch { return null; }
    })();
    const clinic_id = recordData?.clinic_id || (cachedClinicIdBigint ? Number(cachedClinicIdBigint) : null);
    const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const nowIso = new Date().toISOString()

    const row = {
      ...recordData,
      clinic_id,
      id: localId,
      updated_at: nowIso,
      local_created_at: nowIso
    };

    await addItem(STORE_NAMES.FINANCIAL_RECORDS, row);
    await addToQueue({
      table: "financial_records",
      action: "create",
      data: { ...recordData, clinic_id, updated_at: nowIso },
      localId
    });
    return row;
  }, [canUseOffline, hasOfflineContext, isOfflineMode]);

  // Search functions
  const searchOfflinePatients = useCallback(async (searchTerm) => {
    const browserOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (!canUseOffline) return [];
    if (!hasOfflineContext && !browserOffline) return [];
    return searchPatientsOffline(searchTerm);
  }, [hasOfflineContext, isOfflineMode]);

  // Get data functions
  const getOfflinePatients = useCallback(async () => {
    const browserOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (!canUseOffline) return [];
    if (!hasOfflineContext && !browserOffline) return [];
    return getAllItems(STORE_NAMES.PATIENTS);
  }, [hasOfflineContext, isOfflineMode]);

  const getOfflineAppointments = useCallback(async () => {
    const browserOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (!canUseOffline) return [];
    if (!hasOfflineContext && !browserOffline) return [];
    return getAllItems(STORE_NAMES.APPOINTMENTS);
  }, [hasOfflineContext, isOfflineMode]);

  const getOfflineTreatmentPlans = useCallback(async () => {
    const browserOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (!canUseOffline) return [];
    if (!hasOfflineContext && !browserOffline) return [];
    return getAllItems(STORE_NAMES.TREATMENT_PLANS);
  }, [hasOfflineContext, isOfflineMode]);

  const getOfflineFinancialRecords = useCallback(async () => {
    const browserOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (!canUseOffline) return [];
    if (!hasOfflineContext && !browserOffline) return [];
    return getAllItems(STORE_NAMES.FINANCIAL_RECORDS);
  }, [canUseOffline, hasOfflineContext, isOfflineMode]);

  return {
    // Patient operations
    createPatientOffline,
    updatePatientOffline,
    deletePatientOffline,
    searchOfflinePatients,
    getOfflinePatients,
    
    // Appointment operations
    createAppointmentOffline,
    updateAppointmentOffline,
    deleteAppointmentOffline,
    getOfflineAppointments,
    
    // Treatment Plan operations
    createTreatmentPlanOffline,
    updateTreatmentPlanOffline,
    deleteTreatmentPlanOffline,
    getOfflineTreatmentPlans,

    // Financial operations
    createFinancialRecordOffline,
    getOfflineFinancialRecords
  };
}
