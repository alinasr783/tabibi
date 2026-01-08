import { useQuery } from "@tanstack/react-query";
import { getPatientStats } from "../../services/apiPatients";

export default function usePatientStats() {
  return useQuery({
    queryKey: ["patientStats"],
    queryFn: getPatientStats,
  });
}
