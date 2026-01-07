import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteTreatmentTemplate } from "../../services/apiTreatmentTemplates";
import toast from "react-hot-toast";

export default function useDeleteTreatmentTemplate() {
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: deleteTreatmentTemplate,
    onSuccess: () => {
      toast.success("تم حذف الخطة العلاجية بنجاح");
      queryClient.invalidateQueries({ queryKey: ["treatmentTemplates"] });
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء حذف الخطة العلاجية");
    },
  });

  return { mutateAsync, isPending };
}
