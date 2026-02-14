import { useQuery } from "@tanstack/react-query";
import { getTreatmentTemplates } from "../../services/apiTreatmentTemplates";

export default function useTreatmentTemplates() {
    return useQuery({
        queryKey: ["treatmentTemplates"],
        queryFn: getTreatmentTemplates,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
    });
}
