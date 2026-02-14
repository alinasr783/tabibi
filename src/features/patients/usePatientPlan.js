import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPatientPlan } from "../../services/apiPatientPlans";
import supabase from "../../services/supabase";

export default function usePatientPlan(planId) {
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!planId) return;

        const channel = supabase
            .channel(`patient-plan-${planId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "patient_plans",
                    filter: `id=eq.${planId}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ["patientPlan", planId] });
                    queryClient.invalidateQueries({ queryKey: ["patientPlans"] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [planId, queryClient]);

    return useQuery({
        queryKey: ["patientPlan", planId],
        queryFn: () => getPatientPlan(planId),
        enabled: !!planId,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
    });
}
