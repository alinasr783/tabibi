import supabase from "./supabase";

export async function getClinicProfileWallet(clinicId) {
  if (!clinicId) return null;
  const { data, error } = await supabase
    .from("clinic_profile_wallets")
    .select("id, clinic_id, balance, currency, created_at, updated_at")
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function getClinicProfileWalletTransactions(walletId) {
  if (!walletId) return [];
  const { data, error } = await supabase
    .from("clinic_profile_wallet_transactions")
    .select("id, wallet_id, amount, type, description, reference_type, reference_id, status, created_at")
    .eq("wallet_id", walletId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data || [];
}

