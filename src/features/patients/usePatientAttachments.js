import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPatientAttachments, deletePatientAttachment, uploadPatientAttachment } from "../../services/apiAttachments";
import toast from "react-hot-toast";

export function usePatientAttachments(patientId) {
  const queryClient = useQueryClient();

  const { data: attachments, isLoading, error } = useQuery({
    queryKey: ["patient-attachments", patientId],
    queryFn: () => getPatientAttachments(patientId),
    enabled: !!patientId,
  });

  const { mutate: deleteAttachment, isPending: isDeleting } = useMutation({
    mutationFn: deletePatientAttachment,
    onSuccess: () => {
      toast.success("تم حذف الملف بنجاح");
      queryClient.invalidateQueries({ queryKey: ["patient-attachments", patientId] });
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء حذف الملف");
    },
  });

  const { mutate: uploadAttachment, isPending: isUploading } = useMutation({
    mutationFn: uploadPatientAttachment,
    onSuccess: () => {
      toast.success("تم رفع الملف بنجاح");
      queryClient.invalidateQueries({ queryKey: ["patient-attachments", patientId] });
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء رفع الملف");
    },
  });

  return {
    attachments,
    isLoading,
    error,
    deleteAttachment,
    isDeleting,
    uploadAttachment,
    isUploading
  };
}
