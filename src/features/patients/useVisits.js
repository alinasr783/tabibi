import { useQuery } from "@tanstack/react-query"
import { getVisitsByPatientId } from "../../services/apiVisits"

export default function useVisits(patientId) {
    return useQuery({
        queryKey: ["visits", patientId],
        queryFn: () => getVisitsByPatientId(patientId),
        enabled: !!patientId,
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 1,
    })
}