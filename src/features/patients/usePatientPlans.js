import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPatientPlans, createPatientPlan, updatePatientPlan, deletePatientPlan } from "../../services/apiPatientPlans";

export function usePatientPlans(patientId) {
    return useQuery({
        queryKey: ["patientPlans", patientId],
        queryFn: () => getPatientPlans(patientId),
        enabled: !!patientId,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        retry: 1,
    });
}

export function useCreatePatientPlan() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createPatientPlan,
        onSuccess: (_, variables) => {
            // Invalidate patient plans query to refresh the data
            console.log("Invalidating queries for patient:", variables.patient_id);
            if (variables.patient_id) {
                queryClient.invalidateQueries({ queryKey: ["patientPlans", variables.patient_id] });
            }
        },
    });
}

export function useUpdatePatientPlan() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, payload }) => updatePatientPlan(id, payload),
        onSuccess: () => {
            // Invalidate all patient plans queries
            queryClient.invalidateQueries({ queryKey: ["patientPlans"] });
        },
    });
}

export function useDeletePatientPlan() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deletePatientPlan,
        onSuccess: () => {
            // Invalidate all patient plans queries
            queryClient.invalidateQueries({ queryKey: ["patientPlans"] });
        },
    });
}
