import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFinancialRecord } from "../../services/apiFinancialRecords";
import { toast } from "react-hot-toast";

export const useCreateFinancialRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFinancialRecord,
    onSuccess: () => {
      toast.success("تم تسجيل المعاملة بنجاح");
      queryClient.invalidateQueries({ queryKey: ["financialRecords"] });
      queryClient.invalidateQueries({ queryKey: ["financeStats"] }); // Invalidate stats as well if they depend on this
    },
    onError: (error) => {
      toast.error("حدث خطأ أثناء تسجيل المعاملة");
      console.error(error);
    },
  });
};
