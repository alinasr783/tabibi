import { useQuery } from "@tanstack/react-query";
import { getInstalledApps } from "../../services/apiTabibiApps";
import { useAuth } from "../auth/AuthContext";

export default function useInstalledApps() {
    const { user } = useAuth();
    const clinicId = user?.clinic_id;

    return useQuery({
        queryKey: ["installedApps", clinicId],
        queryFn: () => getInstalledApps(clinicId),
        enabled: !!clinicId,
    });
}
