import { useState, useCallback } from "react";
import { useSubscriptionStatus } from "./useSubscriptionStatus";

export function useSubscriptionBlocking() {
  const { data: status, isLoading } = useSubscriptionStatus();
  const [isBlockingModalOpen, setIsBlockingModalOpen] = useState(false);

  const checkAction = useCallback((action) => {
    if (isLoading || !status) return true; // Don't block while loading

    if (status.status === "active") {
      action();
      return true;
    }

    // Block if none or expired
    if (status.status === "none" || status.status === "expired") {
      setIsBlockingModalOpen(true);
      return false;
    }

    action();
    return true;
  }, [isLoading, status]);

  const closeBlockingModal = useCallback(() => {
    setIsBlockingModalOpen(false);
  }, []);

  return {
    checkAction,
    isBlockingModalOpen,
    closeBlockingModal,
    subscriptionStatus: status?.status || "none",
    isLoading
  };
}
