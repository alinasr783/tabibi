import { useQuery } from "@tanstack/react-query";
import { getFinancialRecords } from "../../services/apiFinancialRecords";
import { useOffline } from "../../features/offline-mode/OfflineContext";
import { getOfflineFinancialRecords } from "../../features/offline-mode/offlineDB";

/**
 * Hook to fetch financial records with offline support.
 */
export const useFinancialRecords = (page = 1, pageSize = 50, filters = {}) => {
  const { offlineEnabled, isOnline } = useOffline();
  const shouldUseLocal = offlineEnabled && !isOnline;

  return useQuery({
    queryKey: ["financialRecords", page, pageSize, filters, shouldUseLocal],
    queryFn: async () => {
      if (shouldUseLocal) {
        console.log("[useFinancialRecords] Fetching from IndexedDB (Offline Mode)");
        const data = await getOfflineFinancialRecords(filters);
        
        // Return in same format as API
        return {
          data: data,
          count: data.length
        };
      }

      console.log("[useFinancialRecords] Fetching from Supabase (Online Mode)");
      return getFinancialRecords(page, pageSize, filters);
    },
    staleTime: shouldUseLocal ? Infinity : 1000 * 60 * 5,
    refetchOnWindowFocus: !shouldUseLocal,
  });
};
