import { useQuery } from "@tanstack/react-query";
import { getAppointmentsStatsForLast7Days } from "../../services/apiDashboard";

export default function useAppointmentsChart() {
  return useQuery({
    queryKey: ["appointmentsChart"],
    queryFn: getAppointmentsStatsForLast7Days,
  });
}
