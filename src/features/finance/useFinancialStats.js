import { useQuery } from "@tanstack/react-query";
import { getFinancialSummary, getFinancialChartData } from "../../services/apiFinancialRecords";

export const useFinancialStats = (filters = {}) => {
  return useQuery({
    queryKey: ["financialStats", filters],
    queryFn: () => getFinancialSummary(filters),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
};

export const useFinancialChartData = (filters = {}) => {
  return useQuery({
    queryKey: ["financialChartData", filters],
    queryFn: () => getFinancialChartData(filters),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
};
