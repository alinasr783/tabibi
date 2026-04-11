import { useQuery } from "@tanstack/react-query"
import { searchPatients } from "../../services/apiAppointments"

export default function useSearchPatients(searchTerm, clinicId) {
    return useQuery({
        queryKey: ["patients-search", searchTerm, clinicId],
        queryFn: () => searchPatients(searchTerm, clinicId),
        enabled: searchTerm.trim().length >= 2 && !!clinicId,
        meta: {
            errorMessage: "فشل في البحث عن المرضى"
        }
    })
}
