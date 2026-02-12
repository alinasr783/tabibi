import { useMutation, useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"
import { deletePatient } from "../../services/apiPatients"

export default function useDeletePatient() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id) => deletePatient(id),
        onSuccess: () => {
            toast.success("تم حذف المريض وكافة بياناته بنجاح");
            qc.invalidateQueries({ queryKey: ["patients"] })
            qc.invalidateQueries({ queryKey: ["appointments"] })
            qc.invalidateQueries({ queryKey: ["dashboardStats"] })
        },
        onError: (error) => {
            toast.error("حدث خطأ أثناء حذف المريض: " + error.message);
        },
    })
}
