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
  let hasOfflineContext = false;
  
  try {
    const offlineContext = useOffline();
    isOfflineMode = offlineContext.isOfflineMode;
    hasOfflineContext = true;
  } catch (error) {
    // If we're outside the OfflineProvider, we'll default to online mode
    console.warn("useOfflineData used outside OfflineProvider, defaulting to online mode");
  }

  // Patient operations
  const createPatientOffline = useCallback(async (patientData) => {
    if (!hasOfflineContext || !isOfflineMode) return null;

    try {
      // Generate a temporary local ID
      const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const patientWithLocalId = {
        ...patientData,
        id: localId,
        local_created_at: new Date().toISOString()
      };

      // Save to local database
      await addItem(STORE_NAMES.PATIENTS, patientWithLocalId);

      // Add to offline queue for sync when online
      await addToQueue({
        entityType: 'patient',
        operation: 'create',
        data: patientData,
        localId: localId
      });

      return patientWithLocalId;
    } catch (error) {
      console.error('Error creating patient offline:', error);
      throw error;
    }
  }, [hasOfflineContext, isOfflineMode]);

  const updatePatientOffline = useCallback(async (id, patientData) => {
    if (!hasOfflineContext || !isOfflineMode) return null;

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
        entityType: 'patient',
        operation: 'update',
        entityId: id,
        data: patientData
      });

      return updatedPatient;
    } catch (error) {
      console.error('Error updating patient offline:', error);
      throw error;
    }
  }, [hasOfflineContext, isOfflineMode]);

  const deletePatientOffline = useCallback(async (id) => {
    if (!hasOfflineContext || !isOfflineMode) return null;

    try {
      // Delete from local database
      await deleteItem(STORE_NAMES.PATIENTS, id);

      // Add to offline queue for sync when online
      await addToQueue({
        entityType: 'patient',
        operation: 'delete',
        entityId: id
      });
    } catch (error) {
      console.error('Error deleting patient offline:', error);
      throw error;
    }
  }, [hasOfflineContext, isOfflineMode]);

  // Appointment operations
  const createAppointmentOffline = useCallback(async (appointmentData) => {
    if (!hasOfflineContext || !isOfflineMode) return null;

    try {
      // Generate a temporary local ID
      const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const appointmentWithLocalId = {
        ...appointmentData,
        id: localId,
        local_created_at: new Date().toISOString()
      };

      // Save to local database
      await addItem(STORE_NAMES.APPOINTMENTS, appointmentWithLocalId);

      // Add to offline queue for sync when online
      await addToQueue({
        entityType: 'appointment',
        operation: 'create',
        data: appointmentData,
        localId: localId
      });

      return appointmentWithLocalId;
    } catch (error) {
      console.error('Error creating appointment offline:', error);
      throw error;
    }
  }, [hasOfflineContext, isOfflineMode]);

  const updateAppointmentOffline = useCallback(async (id, appointmentData) => {
    if (!hasOfflineContext || !isOfflineMode) return null;

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
        entityType: 'appointment',
        operation: 'update',
        entityId: id,
        data: appointmentData
      });

      return updatedAppointment;
    } catch (error) {
      console.error('Error updating appointment offline:', error);
      throw error;
    }
  }, [hasOfflineContext, isOfflineMode]);

  const deleteAppointmentOffline = useCallback(async (id) => {
    if (!hasOfflineContext || !isOfflineMode) return null;

    try {
      // Delete from local database
      await deleteItem(STORE_NAMES.APPOINTMENTS, id);

      // Add to offline queue for sync when online
      await addToQueue({
        entityType: 'appointment',
        operation: 'delete',
        entityId: id
      });
    } catch (error) {
      console.error('Error deleting appointment offline:', error);
      throw error;
    }
  }, [hasOfflineContext, isOfflineMode]);

  // Treatment Plan operations
  const createTreatmentPlanOffline = useCallback(async (treatmentPlanData) => {
    if (!hasOfflineContext || !isOfflineMode) return null;

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
        entityType: 'treatmentPlan',
        operation: 'create',
        data: treatmentPlanData,
        localId: localId
      });

      return treatmentPlanWithLocalId;
    } catch (error) {
      console.error('Error creating treatment plan offline:', error);
      throw error;
    }
  }, [hasOfflineContext, isOfflineMode]);

  const updateTreatmentPlanOffline = useCallback(async (id, treatmentPlanData) => {
    if (!hasOfflineContext || !isOfflineMode) return null;

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
        entityType: 'treatmentPlan',
        operation: 'update',
        entityId: id,
        data: treatmentPlanData
      });

      return updatedTreatmentPlan;
    } catch (error) {
      console.error('Error updating treatment plan offline:', error);
      throw error;
    }
  }, [hasOfflineContext, isOfflineMode]);

  const deleteTreatmentPlanOffline = useCallback(async (id) => {
    if (!hasOfflineContext || !isOfflineMode) return null;

    try {
      // Delete from local database
      await deleteItem(STORE_NAMES.TREATMENT_PLANS, id);

      // Add to offline queue for sync when online
      await addToQueue({
        entityType: 'treatmentPlan',
        operation: 'delete',
        entityId: id
      });
    } catch (error) {
      console.error('Error deleting treatment plan offline:', error);
      throw error;
    }
  }, [hasOfflineContext, isOfflineMode]);

  // Search functions
  const searchOfflinePatients = useCallback(async (searchTerm) => {
    if (!hasOfflineContext || !isOfflineMode) return [];
    return searchPatientsOffline(searchTerm);
  }, [hasOfflineContext, isOfflineMode]);

  // Get data functions
  const getOfflinePatients = useCallback(async () => {
    if (!hasOfflineContext || !isOfflineMode) return [];
    return getAllItems(STORE_NAMES.PATIENTS);
  }, [hasOfflineContext, isOfflineMode]);

  const getOfflineAppointments = useCallback(async () => {
    if (!hasOfflineContext || !isOfflineMode) return [];
    return getAllItems(STORE_NAMES.APPOINTMENTS);
  }, [hasOfflineContext, isOfflineMode]);

  const getOfflineTreatmentPlans = useCallback(async () => {
    if (!hasOfflineContext || !isOfflineMode) return [];
    return getAllItems(STORE_NAMES.TREATMENT_PLANS);
  }, [hasOfflineContext, isOfflineMode]);

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
    getOfflineTreatmentPlans
  };
}