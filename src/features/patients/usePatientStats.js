import { useQuery } from "@tanstack/react-query";
import { getPatientStats } from "../../services/apiPatients";
import { useOffline } from "../offline-mode/OfflineContext";
import { getOfflinePatientStats } from "../offline-mode/offlineDB";

export default function usePatientStats(startDate) {
  const { offlineEnabled, isOnline } = useOffline();
  const shouldUseLocal = offlineEnabled && !isOnline;

  return useQuery({
    queryKey: ["patientStats", startDate, shouldUseLocal],
    queryFn: async () => {
      if (shouldUseLocal) {
        console.log("[usePatientStats] Fetching from IndexedDB (Offline Mode)");
        return await getOfflinePatientStats(startDate);
      }
      console.log("[usePatientStats] Fetching from Supabase (Online Mode)");
      return getPatientStats(startDate);
    },
    staleTime: shouldUseLocal ? Infinity : 1000 * 60 * 10,
  });
}
