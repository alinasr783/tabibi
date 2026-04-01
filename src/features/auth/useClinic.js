import { useQuery } from "@tanstack/react-query"
import { getCurrentClinic } from "../../services/apiClinic"
import { useOffline } from "../offline-mode/OfflineContext"
import { db, STORE_NAMES } from "../offline-mode/offlineDB"

export default function useClinic() {
    const { isOfflineMode, isOnline } = useOffline();
    const shouldUseLocal = isOfflineMode || !isOnline;

    return useQuery({
        queryKey: ["clinic", shouldUseLocal],
        queryFn: async () => {
            if (shouldUseLocal) {
                console.log("[useClinic] Fetching clinic from IndexedDB (Offline)");
                const clinics = await db.table(STORE_NAMES.CLINICS).toArray();
                return clinics[0] || null; // Return the first (and only) synced clinic
            }
            return getCurrentClinic();
        },
        retry: 1,
        staleTime: shouldUseLocal ? Infinity : 1000 * 60 * 5, // 5 minutes
        cacheTime: 1000 * 60 * 30, // 30 minutes
    })
}