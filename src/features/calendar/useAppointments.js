import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { getAppointments, subscribeToAppointments } from "../../services/apiAppointments"
import { addToGoogleCalendar } from "../../services/integrationService"
import useClinic from "../auth/useClinic"

export default function useAppointments(search, page, pageSize = 10, filters = {}) {
    const queryClient = useQueryClient()
    const { data: clinic } = useClinic()
    
    const queryResult = useQuery({
        queryKey: ["appointments", search, page, pageSize, filters],
        queryFn: async () => {
            console.log("useAppointments/queryFn/start", { search, page, pageSize, filters })
            const result = await getAppointments(search, page, pageSize, filters)
            console.log("useAppointments/queryFn/result", { count: result?.count, length: (result?.data || []).length })
            return result
        },
        placeholderData: (previousData) => previousData, // Keep previous data while fetching new page to prevent loading state flicker
        meta: {
            errorMessage: "فشل في تحميل المواعيد"
        }
    })

    // Setup real-time subscription
    useEffect(() => {
        if (!clinic?.clinic_uuid) return

        console.log("useAppointments/subscription/setup", { clinicUuid: clinic.clinic_uuid, source: filters.source })

        const unsubscribe = subscribeToAppointments(
            async (payload) => {
                // Realtime sync to Google Calendar is now handled globally in useGoogleCalendarSync hook
                // We just need to refresh the UI here
                
                console.log("useAppointments/subscription/event", payload.eventType)
                
                if (payload.eventType === 'UPDATE') {
                    // Update cache in-place to avoid re-sorting/jumping
                    // Use fuzzy matching for query keys to catch all pagination variations
                    queryClient.setQueriesData({ queryKey: ["appointments"] }, (oldData) => {
                        if (!oldData || !oldData.data) return oldData;
                        
                        // Check if the updated item exists in this page
                        const exists = oldData.data.some(item => item.id == payload.new.id);
                        if (!exists) return oldData;

                        return {
                            ...oldData,
                            data: oldData.data.map(item => 
                                item.id == payload.new.id 
                                    ? { ...item, ...payload.new } // Merge new data (e.g. status) while keeping existing (e.g. patient info)
                                    : item
                            )
                        };
                    });
                } else {
                    // For INSERT/DELETE, we still invalidate to show/hide items
                    queryClient.invalidateQueries({ queryKey: ["appointments"] })
                }
            },
            clinic.clinic_uuid,
            filters.source
        )

        return () => {
            console.log("useAppointments/subscription/cleanup")
            unsubscribe()
        }
    }, [clinic?.clinic_uuid, filters.source, queryClient])

    return queryResult
}
