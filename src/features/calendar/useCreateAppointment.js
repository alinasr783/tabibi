import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createAppointment } from "../../services/apiAppointments"
import { useOffline } from "../offline-mode/OfflineContext"
import { useOfflineData } from "../offline-mode/useOfflineData"
import toast from "react-hot-toast"

export default function useCreateAppointment() {
    const queryClient = useQueryClient()
    let isOfflineMode = false
    let enqueueOperation = null
    let hasOfflineContext = false
    try {
      const offlineContext = useOffline()
      isOfflineMode = offlineContext.isOfflineMode
      enqueueOperation = offlineContext.enqueueOperation
      hasOfflineContext = true
    } catch {}
    const { createAppointmentOffline } = useOfflineData()

    return useMutation({
        mutationFn: async (data) => {
          if (hasOfflineContext && isOfflineMode) {
            const local = await createAppointmentOffline(data)
            toast.success("تم حفظ الموعد محليًا وسيتم مزامنته تلقائيًا")
            return local
          }
          return createAppointment(data)
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["appointments"] })
            queryClient.invalidateQueries({ queryKey: ["dashboardStats"] })
            queryClient.invalidateQueries({ queryKey: ["filteredPatientStats"] })
            if (hasOfflineContext && isOfflineMode && enqueueOperation) {
              enqueueOperation('appointment', 'create', variables)
            } else {
              toast.success("تم إضافة الموعد بنجاح")
            }
        },
        onError: (error) => {
            console.error("Error in useCreateAppointment:", error)
            toast.error(error.message || "فشل إضافة الموعد")
        },
    })
}
