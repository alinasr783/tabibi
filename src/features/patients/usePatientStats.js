import { useQuery } from "@tanstack/react-query";
import { getPatientStats } from "../../services/apiPatients";

export default function usePatientStats(startDate) {
  return useQuery({
    queryKey: ["patientStats", startDate],
    queryFn: () => getPatientStats(startDate),
  });
}
