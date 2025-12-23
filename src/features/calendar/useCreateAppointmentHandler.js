import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { createAppointment } from "../../services/apiAppointments";

export default function useCreateAppointmentHandler() {
  const queryClient = useQueryClient();

  const { mutate: handleAppointmentSubmit, isPending } = useMutation({
    mutationFn: async (appointmentData) => {
      // Add validation to ensure we have proper appointment data
      if (!appointmentData || !appointmentData.patient_id || !appointmentData.clinic_id) {
        throw new Error("بيانات الموعد غير كاملة");
      }
      return await createAppointment(appointmentData);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      
      // إرجاع البيانات للمكون
      return data;
    },
    onError: (error) => {
      console.error("خطأ في إنشاء الموعد:", error);
      toast.error(error.message || "حدث خطأ أثناء إضافة الموعد");
    }
  });

  return { 
    handleAppointmentSubmit: (appointmentData, onSuccess) => {
      // Additional validation before submission
      if (!appointmentData || typeof appointmentData !== 'object') {
        console.error("Invalid appointment data provided");
        toast.error("بيانات الموعد غير صحيحة");
        return;
      }
      
      handleAppointmentSubmit(appointmentData, {
        onSuccess: (data) => {
          if (onSuccess) onSuccess(data);
        }
      });
    }, 
    isPending 
  };
}