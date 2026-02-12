import { useMutation, useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"
import { deleteAppointment } from "../../services/apiAppointments"

export default function useDeleteAppointment() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id) => deleteAppointment(id),
        onSuccess: () => {
            toast.success("تم حذف الحجز بنجاح");
            qc.invalidateQueries({ queryKey: ["appointments"], exact: false })
            qc.invalidateQueries({ queryKey: ["patient-appointments"], exact: false })
            // Also invalidate dashboard stats if needed
            qc.invalidateQueries({ queryKey: ["dashboardStats"] })
        },
        onError: (error) => {
            toast.error("حدث خطأ أثناء حذف الحجز: " + error.message);
        },
    })
}
