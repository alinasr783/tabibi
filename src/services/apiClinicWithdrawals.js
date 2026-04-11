import supabase from "./supabase";

export async function getClinicWithdrawalRequests(clinicId) {
  if (!clinicId) return [];
  const { data, error } = await supabase
    .from("clinic_profile_withdrawal_requests")
    .select("id, clinic_id, amount, status, payout_method, payout_details, admin_note, created_at, updated_at")
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data || [];
}

export async function requestClinicWithdrawal({ amount, payoutMethod, payoutDetails }) {
  const payload = {
    amount: Number(amount),
    payout_method: payoutMethod,
    payout_details: payoutDetails,
  };
  const { data, error } = await supabase.rpc("request_clinic_profile_withdrawal", payload);
  if (error) throw error;
  return data;
}
