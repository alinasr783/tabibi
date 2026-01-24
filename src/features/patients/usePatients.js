import { useInfiniteQuery } from "@tanstack/react-query"
import { getPatients } from "../../services/apiPatients"
import { PAGE_SIZE } from "../../constants/pagination"
import { useOffline } from "../../features/offline-mode/OfflineContext"
import { useOfflineData } from "../../features/offline-mode/useOfflineData"

export default function usePatients(search, filters = {}, pageSize = 20, options = {}) {
  // Add a try-catch block to handle cases where the hook is used outside the provider
  let isOfflineMode = false;
  let hasOfflineContext = false;
  
  try {
    const offlineContext = useOffline();
    isOfflineMode = offlineContext.isOfflineMode;
    hasOfflineContext = true;
  } catch (error) {
    // If we're outside the OfflineProvider, we'll default to online mode
    console.warn("usePatients used outside OfflineProvider, defaulting to online mode");
  }
  
  const { searchOfflinePatients } = useOfflineData()
  const isEnabled = options.enabled !== undefined ? options.enabled : true;
  
  // For offline mode, we'll handle search differently
  if (hasOfflineContext && isOfflineMode) {
    // In offline mode, we don't use pagination, just search all local patients
    // We wrap it in useInfiniteQuery structure for consistency
    return useInfiniteQuery({
      queryKey: ["patients", "offline", search ?? ""],
      queryFn: async () => {
        const data = await searchOfflinePatients(search);
        return { items: data, total: data.length };
      },
      enabled: isOfflineMode && isEnabled,
      getNextPageParam: () => undefined,
    })
  }
  
  // Online mode - use infinite query
  return useInfiniteQuery({
    queryKey: ["patients", search ?? "", filters, pageSize],
    queryFn: ({ pageParam = 1 }) => getPatients(search, pageParam, pageSize, filters),
    getNextPageParam: (lastPage, allPages) => {
      const totalLoaded = allPages.flatMap(page => page.items).length;
      if (totalLoaded < lastPage.total) {
        return allPages.length + 1;
      }
      return undefined;
    },
    enabled: !isOfflineMode && isEnabled
  })
}