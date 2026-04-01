import { useQuery } from "@tanstack/react-query"
import { getAppointmentById } from "../../services/apiAppointments"
import { useOffline } from "../offline-mode/OfflineContext";
import { getItemOffline, STORE_NAMES } from "../offline-mode/offlineDB";

export default function useAppointment(id) {
    const { isOfflineMode, isOnline } = useOffline();
    const shouldUseLocal = isOfflineMode || !isOnline;

    return useQuery({
        queryKey: ["appointment", id, shouldUseLocal],
        queryFn: async () => {
            if (shouldUseLocal) {
                console.log(`[useAppointment] Fetching appointment ${id} from IndexedDB (Offline)`);
                return await getItemOffline(STORE_NAMES.APPOINTMENTS, id);
            }
            return getAppointmentById(id);
        },
        meta: {
            errorMessage: "فشل في تحميل تفاصيل الحجز"
        },
        enabled: !!id,
        staleTime: shouldUseLocal ? Infinity : 0
    })
}
