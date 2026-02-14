import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import supabase from "../../services/supabase";
import { getPatientFinanceLedger, getPatientFinanceSummary } from "../../services/apiPatientFinance";

export function usePatientFinanceRealtime(patientId) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!patientId) return;

    const channel = supabase
      .channel(`patient-finance-ledger-${patientId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "financial_records",
          filter: `patient_id=eq.${patientId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["patientFinanceLedger", patientId] });
          queryClient.invalidateQueries({ queryKey: ["patientFinanceSummary", patientId] });
          queryClient.invalidateQueries({ queryKey: ["patientFinancialData", patientId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientId, queryClient]);
}

export function usePatientFinanceLedger(patientId, filters = {}) {
  usePatientFinanceRealtime(patientId);

  return useQuery({
    queryKey: ["patientFinanceLedger", patientId, filters],
    queryFn: () => getPatientFinanceLedger(patientId, filters),
    enabled: !!patientId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

export function usePatientFinanceSummary(patientId, filters = {}) {
  usePatientFinanceRealtime(patientId);

  return useQuery({
    queryKey: ["patientFinanceSummary", patientId, filters],
    queryFn: () => getPatientFinanceSummary(patientId, filters),
    enabled: !!patientId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

