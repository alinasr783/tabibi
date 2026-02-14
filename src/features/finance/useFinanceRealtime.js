import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import supabase from "../../services/supabase";

async function getClinicIdBigintFromSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("clinic_id_bigint, clinic_id")
    .eq("user_id", session.user.id)
    .single();

  if (userError) return null;

  let clinicIdBigint = userData?.clinic_id_bigint;
  if (!clinicIdBigint && userData?.clinic_id) {
    const { data: clinicData, error: clinicError } = await supabase
      .from("clinics")
      .select("clinic_id_bigint, id")
      .eq("clinic_uuid", userData.clinic_id)
      .single();

    if (!clinicError) clinicIdBigint = clinicData?.clinic_id_bigint || clinicData?.id;
  }

  return clinicIdBigint || null;
}

export default function useFinanceRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let channel;
    let cancelled = false;

    (async () => {
      const clinicIdBigint = await getClinicIdBigintFromSession();
      if (cancelled || !clinicIdBigint) return;

      channel = supabase
        .channel(`finance-realtime-${clinicIdBigint}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "financial_records",
            filter: `clinic_id=eq.${clinicIdBigint}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ["financialRecords"] });
            queryClient.invalidateQueries({ queryKey: ["financialStats"] });
            queryClient.invalidateQueries({ queryKey: ["financialChartData"] });
          }
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

