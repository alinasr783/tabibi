import { useQuery } from "@tanstack/react-query"
import { getDashboardStats } from "../../services/apiDashboard"

export default function useDashboardStats() {
    return useQuery({
        queryKey: ["dashboardStats"],
        queryFn: getDashboardStats,
        staleTime: 0,
        refetchOnMount: true,
        refetchOnWindowFocus: true,
    })
}
