import { useQuery } from "@tanstack/react-query"
import { getPatients } from "../../services/apiPatients"
import { PAGE_SIZE } from "../../constants/pagination"
import { useOffline } from "../../features/offline-mode/OfflineContext"
import { useOfflineData } from "../../features/offline-mode/useOfflineData"

export default function usePatients(search, page = 1) {
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
  
  // For offline mode, we'll handle search differently
  if (hasOfflineContext && isOfflineMode) {
    // In offline mode, we don't use pagination, just search all local patients
    return useQuery({
      queryKey: ["patients", "offline", search ?? ""],
      queryFn: () => searchOfflinePatients(search),
      enabled: isOfflineMode
    })
  }
  
  // Online mode - use the original implementation
  return useQuery({
    queryKey: ["patients", search ?? "", page],
    queryFn: () => getPatients(search, page, PAGE_SIZE),
    enabled: !isOfflineMode
  })
}