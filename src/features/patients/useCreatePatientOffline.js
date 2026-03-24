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

  const withTimeout = (promise, ms) => {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("Network timeout")), ms);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
  };

  return useMutation({
    mutationFn: async (patientData) => {
      const browserOffline = typeof navigator !== "undefined" && navigator.onLine === false;
      const keys = patientData && typeof patientData === "object" ? Object.keys(patientData).sort() : [];
      console.groupCollapsed("[PATIENT_CREATE] hook mutationFn");
      console.log("[PATIENT_CREATE] hasOfflineContext:", hasOfflineContext, "isOfflineMode:", isOfflineMode, "browserOffline:", browserOffline);
      console.log("[PATIENT_CREATE] patientDataKeys:", keys);
      try {
        if ((hasOfflineContext && isOfflineMode) || browserOffline) {
          console.log("[PATIENT_CREATE] createPatientOffline start (detected offline)");
          const localPatient = await createPatientOffline(patientData);
          console.log("[PATIENT_CREATE] createPatientOffline done", { id: localPatient?.id });
          toast.success("تم حفظ المريض محليًا وسيتم مزامنته تلقائيًا عند عودة الاتصال");
          return localPatient;
        }
        try {
          console.log("[PATIENT_CREATE] createPatient start (online)");
          const serverPatient = await withTimeout(createPatient(patientData), 8000);
          console.log("[PATIENT_CREATE] createPatient done", { id: serverPatient?.id });
          return serverPatient;
        } catch (err) {
          const msg = String(err?.message || "").toLowerCase();
          const considerOffline =
            browserOffline ||
            msg.includes("network error") ||
            msg.includes("timeout") ||
            msg.includes("fetch failed") ||
            msg.includes("user has no clinic assigned");
          if (hasOfflineContext && considerOffline) {
            console.warn("[PATIENT_CREATE] fallback to offline due to error:", err?.message);
            const localPatient = await createPatientOffline(patientData);
            console.log("[PATIENT_CREATE] fallback createPatientOffline done", { id: localPatient?.id });
            toast.success("تم حفظ المريض محليًا وسيتم مزامنته تلقائيًا عند عودة الاتصال");
            return localPatient;
          }
          throw err;
        }
      } finally {
        console.groupEnd();
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate queries to refresh the UI
      qc.invalidateQueries({ queryKey: ["patients"] });
      // Also invalidate dashboard stats to update the patient count
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
      qc.invalidateQueries({ queryKey: ["filteredPatientStats"] });
      
      // If we're offline and have the context, enqueue the operation for sync when online
      const isLocalPatient = String(data?.id || "").startsWith("local_");
      if (hasOfflineContext && isOfflineMode && enqueueOperation && !isLocalPatient) {
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
