import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTreatmentTemplate } from "../../services/apiTreatmentTemplates";
import toast from "react-hot-toast";

export default function useCreateTreatmentTemplate() {
    const queryClient = useQueryClient();

    const { mutateAsync, isPending } = useMutation({
        mutationFn: createTreatmentTemplate,
        onSuccess: () => {
            toast.success("تم إضافة الخطة العلاجية بنجاح");
            // Invalidate and refetch treatment templates
            queryClient.invalidateQueries({
                queryKey: ["treatmentTemplates"],
            });
        },
        onError: (error) => {
            console.error("Error creating treatment template:", error);
            toast.error(error.message);
        },
    });

    return { mutateAsync, isPending };
}