import { useQuery } from "@tanstack/react-query"
import { getPatientById } from "../../services/apiPatients"
import { useOffline } from "../offline-mode/OfflineContext";
import { getItemOffline, STORE_NAMES } from "../offline-mode/offlineDB";

export default function usePatient(id) {
  const { isOfflineMode, isOnline } = useOffline();
  const shouldUseLocal = isOfflineMode || !isOnline;

  return useQuery({
    queryKey: ["patient", id, shouldUseLocal],
    queryFn: async () => {
      if (shouldUseLocal) {
        console.log(`[usePatient] Fetching patient ${id} from IndexedDB (Offline)`);
        return await getItemOffline(STORE_NAMES.PATIENTS, id);
      }
      return getPatientById(id);
    },
    enabled: !!id,
    staleTime: shouldUseLocal ? Infinity : 5 * 60 * 1000,
    retry: 1,
  })
}
