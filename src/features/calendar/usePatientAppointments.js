import { useQuery } from "@tanstack/react-query"
import { getPatientAppointments } from "../../services/apiAppointments"

export default function usePatientAppointments(patientId) {
    return useQuery({
        queryKey: ["patient-appointments", patientId],
        queryFn: () => getPatientAppointments(patientId),
        enabled: !!patientId,
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 1,
        meta: {
            errorMessage: "فشل في تحميل سجل الحجوزات"
        }
    })
}