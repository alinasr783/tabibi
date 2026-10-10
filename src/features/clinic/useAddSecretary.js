import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addSecretary } from "../../services/apiAuth";
import toast from "react-hot-toast";

export default function useAddSecretary() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: addSecretary,
        onSuccess: () => {
            toast.success("تمت إضافة السكرتير بنجاح");
            queryClient.invalidateQueries(["clinicSecretaries"]);
        },
        onError: (error) => {
            console.error("addSecretary error:", error);
            const errorMessage = error?.message || error?.error_description || "حدث خطأ";
            toast.error(errorMessage);
        }
    });
}