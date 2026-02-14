import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPatientFinancialData } from "../../services/apiPatients";
import { useEffect } from "react";
import supabase from "../../services/supabase";

export default function usePatientFinancialData(patientId) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!patientId) return;

    const channel = supabase
      .channel(`financial-update-${patientId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'financial_records', 
          filter: `patient_id=eq.${patientId}` 
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["patientFinancialData", patientId] });
          queryClient.invalidateQueries({ queryKey: ["patientFinanceLedger", Number(patientId)] });
          queryClient.invalidateQueries({ queryKey: ["patientFinanceSummary", Number(patientId)] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientId, queryClient]);

  return useQuery({
    queryKey: ["patientFinancialData", patientId],
    queryFn: () => getPatientFinancialData(patientId),
    enabled: !!patientId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
