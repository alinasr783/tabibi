import supabase from "./supabase";

/**
 * Get clinic wallet details
 * @param {string} clinicId 
 * @returns {Promise<Object>} Wallet details
 */
export async function getClinicWallet(clinicId) {
  const { data, error } = await supabase
    .from("clinic_wallets")
    .select("*")
    .eq("clinic_id", clinicId)
    .single();

  if (error) {
    // If no wallet found, we might want to return a default structure or null
    // But for now, let's throw the error so the UI knows something went wrong
    // unless it's a "row not found" which might be expected for new clinics
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  
  return data;
}

/**
 * Get wallet transactions
 * @param {string} walletId 
 * @returns {Promise<Array>} List of transactions
 */
export async function getWalletTransactions(walletId) {
  if (!walletId) return [];
  
  const { data, error } = await supabase
    .from("wallet_transactions")
    .select("*")
    .eq("wallet_id", walletId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  
  return data;
}
