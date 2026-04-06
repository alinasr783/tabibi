import { useQuery } from "@tanstack/react-query"
import { getClinicById, getClinicByBigintId } from "../../services/apiClinic"

const isUuid = (v) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v));

export default function useClinicById(clinicId) {
    return useQuery({
        queryKey: ["clinic", clinicId],
        queryFn: () => isUuid(clinicId) ? getClinicById(clinicId) : getClinicByBigintId(clinicId),
        enabled: !!clinicId,
        retry: false,
    })
}