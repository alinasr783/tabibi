import { useQuery } from "@tanstack/react-query"
import { getVisitById } from "../../services/apiVisits"
import { useOffline } from "../offline-mode/OfflineContext";
import { getItemOffline, STORE_NAMES } from "../offline-mode/offlineDB";

export default function useVisit(visitId) {
    const { isOfflineMode, isOnline } = useOffline();
    const shouldUseLocal = isOfflineMode || !isOnline;

    return useQuery({
        queryKey: ["visit", visitId, shouldUseLocal],
        queryFn: async () => {
            if (shouldUseLocal) {
                console.log(`[useVisit] Fetching visit ${visitId} from IndexedDB (Offline)`);
                return await getItemOffline(STORE_NAMES.VISITS, visitId);
            }
            return getVisitById(visitId);
        },
        enabled: !!visitId,
        staleTime: shouldUseLocal ? Infinity : 0
    })
}
