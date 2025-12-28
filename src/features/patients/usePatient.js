import { useQuery } from "@tanstack/react-query"
import { getPatientById } from "../../services/apiPatients"

export default function usePatient(id) {
  return useQuery({
    queryKey: ["patient", id],
    queryFn: () => getPatientById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })
}
