import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPatient } from "../../services/apiPatients";
import { useOffline } from "../offline-mode/OfflineContext";
import { useOfflineData } from "../offline-mode/useOfflineData";
import toast from "react-hot-toast";

export default function useCreatePatientOffline() {
  const qc = useQueryClient();
  
  // Add a try-catch block to handle cases where the hook is used outside the provider
  let isOfflineMode = false;
  let enqueueOperation = null;
  let hasOfflineContext = false;
  
  try {
    const offlineContext = useOffline();
    isOfflineMode = offlineContext.isOfflineMode;
    enqueueOperation = offlineContext.enqueueOperation;
    hasOfflineContext = true;
  } catch (error) {
    // If we're outside the OfflineProvider, we'll default to online mode
    console.warn("useCreatePatientOffline used outside OfflineProvider, defaulting to online mode");
  }
  
  const { createPatientOffline } = useOfflineData();

  return useMutation({
    mutationFn: async (patientData) => {
      if (hasOfflineContext && isOfflineMode) {
        // Create patient locally when offline
        const localPatient = await createPatientOffline(patientData);
        toast.success("تم حفظ المريض محليًا وسيتم مزامنته تلقائيًا عند عودة الاتصال");
        return localPatient;
      } else {
        // Create patient on server when online
        return await createPatient(patientData);
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate queries to refresh the UI
      qc.invalidateQueries({ queryKey: ["patients"] });
      // Also invalidate dashboard stats to update the patient count
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
      qc.invalidateQueries({ queryKey: ["filteredPatientStats"] });
      
      // If we're offline and have the context, enqueue the operation for sync when online
      if (hasOfflineContext && isOfflineMode && enqueueOperation) {
        enqueueOperation('patient', 'create', variables);
      }
      
      return data;
    },
    onError: (error) => {
      console.error("Error creating patient:", error);
      toast.error(error.message || "حدث خطأ أثناء إضافة المريض");
    }
  });
}