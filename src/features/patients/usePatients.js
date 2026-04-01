import { useInfiniteQuery } from "@tanstack/react-query"
import { getPatients } from "../../services/apiPatients"
import { useOffline } from "../../features/offline-mode/OfflineContext"
import { searchPatientsOffline } from "../../features/offline-mode/offlineDB"

/**
 * Hook to fetch patients with offline support.
 */
export default function usePatients(search, filters = {}, pageSize = 20, options = {}) {
  const { offlineEnabled, isOnline } = useOffline();
  
  // Decide if we should use local data
  // Use local if we are explicitly offline OR if we are disconnected
  const shouldUseLocal = offlineEnabled && !isOnline;
  const isEnabled = options.enabled !== undefined ? options.enabled : true;
  
  return useInfiniteQuery({
    queryKey: ["patients", search ?? "", filters, pageSize, shouldUseLocal],
    queryFn: async ({ pageParam = 1 }) => {
      if (shouldUseLocal) {
        console.log("[usePatients] Fetching from IndexedDB (Offline Mode)");
        const data = await searchPatientsOffline(search);
        
        // Return in same format as API for compatibility
        return { 
          items: data, 
          total: data.length,
          page: 1,
          pageSize: data.length
        };
      }
      
      console.log("[usePatients] Fetching from Supabase (Online Mode)");
      return getPatients(search, pageParam, pageSize, filters);
    },
    getNextPageParam: (lastPage, allPages) => {
      if (shouldUseLocal) return undefined; // No pagination in offline mode
      
      const totalLoaded = allPages.flatMap(page => page.items).length;
      if (totalLoaded < (lastPage?.total || 0)) {
        return allPages.length + 1;
      }
      return undefined;
    },
    enabled: isEnabled,
    staleTime: shouldUseLocal ? Infinity : 1000 * 60 * 5, // Cache longer if offline
  });
}
