import { useQuery } from "@tanstack/react-query";
import { getInstalledApps } from "../../services/apiTabibiApps";
import useClinic from "../auth/useClinic";

export default function useInstalledApps() {
    const { data: clinic } = useClinic();
    const clinicId = clinic?.clinic_uuid;

    return useQuery({
        queryKey: ["installed_apps", clinicId],
        queryFn: () => getInstalledApps(clinicId),
        enabled: !!clinicId,
    });
}
