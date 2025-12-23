import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTreatmentTemplate } from "../../services/apiTreatmentTemplates";
import toast from "react-hot-toast";

export default function useUpdateTreatmentTemplate() {
    const queryClient = useQueryClient();

    const { mutateAsync, isPending } = useMutation({
        mutationFn: updateTreatmentTemplate,
        onSuccess: () => {
            toast.success("تم تحديث الخطة العلاجية بنجاح");
            // Invalidate and refetch treatment templates
            queryClient.invalidateQueries({
                queryKey: ["treatmentTemplates"],
            });
        },
        onError: (error) => {
            console.error("Error updating treatment template:", error);
            toast.error(error.message);
        },
    });

    return { mutateAsync, isPending };
}