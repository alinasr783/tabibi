import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { getAppointments, subscribeToAppointments } from "../../services/apiAppointments"
import useClinic from "../auth/useClinic"
import { useOffline } from "../../features/offline-mode/OfflineContext"
import { getOfflineAppointments } from "../../features/offline-mode/offlineDB"

/**
 * Hook to fetch appointments with offline support.
 */
export default function useAppointments(search, page, pageSize = 10, filters = {}) {
    const queryClient = useQueryClient()
    const { data: clinic } = useClinic()
    const { offlineEnabled, isOnline } = useOffline()
    
    const shouldUseLocal = offlineEnabled && !isOnline;
    
    const queryResult = useQuery({
        queryKey: ["appointments", search, page, pageSize, filters, shouldUseLocal],
        queryFn: async () => {
            if (shouldUseLocal) {
                console.log("[useAppointments] Fetching from IndexedDB (Offline Mode)");
                const data = await getOfflineAppointments(filters);
                
                // Return in same format as API
                return {
                    data: data,
                    count: data.length
                };
            }
            
            console.log("[useAppointments] Fetching from Supabase (Online Mode)");
            return await getAppointments(search, page, pageSize, filters)
        },
        placeholderData: (previousData) => previousData,
        staleTime: shouldUseLocal ? Infinity : 1000 * 60 * 2,
    })

    // Setup real-time subscription (only if online)
    useEffect(() => {
        if (!clinic?.clinic_uuid || shouldUseLocal) return

        const unsubscribe = subscribeToAppointments(
            async (payload) => {
                if (payload.eventType === 'UPDATE') {
                    queryClient.setQueriesData({ queryKey: ["appointments"] }, (oldData) => {
                        if (!oldData || !oldData.data) return oldData;
                        const exists = oldData.data.some(item => item.id == payload.new.id);
                        if (!exists) return oldData;

                        return {
                            ...oldData,
                            data: oldData.data.map(item => 
                                item.id == payload.new.id 
                                    ? { ...item, ...payload.new }
                                    : item
                            )
                        };
                    });
                } else {
                    queryClient.invalidateQueries({ queryKey: ["appointments"] })
                }
            },
            clinic.clinic_uuid,
            filters.source
        )

        return () => unsubscribe()
    }, [clinic?.clinic_uuid, filters.source, queryClient, shouldUseLocal])

    return queryResult
}
