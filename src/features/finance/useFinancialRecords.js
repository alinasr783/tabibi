import { useQuery } from "@tanstack/react-query";
import { getFinancialRecords } from "../../services/apiFinancialRecords";

export const useFinancialRecords = (page = 1, pageSize = 50, filters = {}) => {
  return useQuery({
    queryKey: ["financialRecords", page, pageSize, filters],
    queryFn: () => getFinancialRecords(page, pageSize, filters),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
};
