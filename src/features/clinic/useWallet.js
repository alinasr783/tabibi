import { useQuery } from "@tanstack/react-query";
import { getClinicWallet, getWalletTransactions } from "../../services/apiWallet";
import { useAuth } from "../auth/AuthContext";

export default function useWallet() {
  const { user } = useAuth();
  const clinicId = user?.clinic_id;

  // 1. Get Wallet Info
  const { 
    data: wallet, 
    isLoading: isWalletLoading,
    error: walletError
  } = useQuery({
    queryKey: ["clinicWallet", clinicId],
    queryFn: () => getClinicWallet(clinicId),
    enabled: !!clinicId,
  });

  // 2. Get Transactions (only if wallet exists)
  const { 
    data: transactions, 
    isLoading: isTransactionsLoading 
  } = useQuery({
    queryKey: ["walletTransactions", wallet?.id],
    queryFn: () => getWalletTransactions(wallet?.id),
    enabled: !!wallet?.id,
  });

  return {
    wallet,
    transactions: transactions || [],
    isLoading: isWalletLoading || isTransactionsLoading,
    error: walletError,
  };
}
