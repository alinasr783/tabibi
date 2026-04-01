import { useQuery } from "@tanstack/react-query";
import { getCurrentPlan } from "../../services/apiPlan";
import { useOffline } from "../offline-mode/OfflineContext";

export function useSubscriptionStatus() {
  const { isOfflineMode } = useOffline();

  return useQuery({
    queryKey: ["subscriptionStatus", isOfflineMode],
    queryFn: async () => {
      // If offline, assume active to avoid network errors and blocking the UI
      if (isOfflineMode) {
        return {
          hasActivePlan: true,
          isExpired: false,
          planName: "وضع بدون إنترنت",
          daysRemaining: 30,
          status: "active",
          isOffline: true
        };
      }

      try {
        const planData = await getCurrentPlan();

        // 1. No plan at all (New user or never subscribed)
        if (!planData) {
          return {
            hasActivePlan: false,
            isExpired: false,
            planName: null,
            daysRemaining: null,
            status: "none", // no plan
          };
        }

        const endDate = planData.current_period_end;
        const planName = planData.plans?.name || "باقة";

        if (!endDate) {
          return {
            hasActivePlan: true,
            isExpired: false,
            planName,
            daysRemaining: null,
            status: "active",
          };
        }

        const today = new Date();
        const end = new Date(endDate);
        const diffTime = end - today;
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // 2. Expired plan
        if (daysRemaining < 0) {
          return {
            hasActivePlan: false,
            isExpired: true,
            planName,
            daysRemaining,
            status: "expired",
          };
        }

        // 3. Active plan
        return {
          hasActivePlan: true,
          isExpired: false,
          planName,
          daysRemaining,
          status: "active",
        };
      } catch (error) {
        console.error("Error checking subscription status:", error);
        return {
          hasActivePlan: false,
          isExpired: false,
          planName: null,
          daysRemaining: null,
          status: "error",
        };
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}
