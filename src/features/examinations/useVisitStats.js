import { useQuery } from "@tanstack/react-query";
import { getExaminationsStats } from "../../services/apiVisits";

export default function useVisitStats() {
  return useQuery({
    queryKey: ["examinationsStats"],
    queryFn: getExaminationsStats,
  });
}
