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
        queryFn: () => getAppointments(search, page, pageSize, filters),
        meta: {
            errorMessage: "فشل في تحميل المواعيد"
        }
    })

    // Setup real-time subscription
    useEffect(() => {
        if (!clinic?.clinic_uuid) return

        console.log("Setting up real-time subscription for appointments, clinic:", clinic.clinic_uuid)

        const unsubscribe = subscribeToAppointments(
            async (payload) => {
                if (payload.eventType === "INSERT" && payload.new?.from === "booking") {
                    try {
                        await addToGoogleCalendar({
                            date: payload.new.date,
                            notes: payload.new.notes,
                            price: payload.new.price,
                            patient_name: ""
                        })
                    } catch {}
                }
                queryClient.invalidateQueries({ queryKey: ["appointments"] })
            },
            clinic.clinic_uuid,
            filters.source
        )

        return () => {
            console.log("Cleaning up real-time subscription for appointments")
            unsubscribe()
        }
    }, [clinic?.clinic_uuid, filters.source, queryClient])

    return queryResult
}
