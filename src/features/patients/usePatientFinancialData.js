import { useQuery } from "@tanstack/react-query";
import { getPatientFinancialData } from "../../services/apiPatients";

export default function usePatientFinancialData(patientId) {
  return useQuery({
    queryKey: ["patientFinancialData", patientId],
    queryFn: () => getPatientFinancialData(patientId),
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}