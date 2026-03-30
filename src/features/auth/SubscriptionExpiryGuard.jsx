import { useEffect } from "react";
import { useSubscriptionStatus } from "./useSubscriptionStatus";
import SubscriptionExpiryPopup from "../../components/SubscriptionExpiryPopup";

// List of pages that should be restricted when subscription expires or is missing
const RESTRICTED_PAGES = [
    "/work-mode",
    "/online-booking",
    "/tabibi-apps",
    "/my-apps"
];

// Check if current path matches restricted pages (including detail pages)
const isRestrictedPage = (pathname) => {
    return RESTRICTED_PAGES.some(page => 
        pathname === page || pathname.startsWith(`${page}/`)
    );
};

export default function SubscriptionExpiryGuard({ children }) {
    const { data: status, isLoading } = useSubscriptionStatus();
    
    // Check if we're on a restricted page
    useEffect(() => {
        // We could add additional logic here if needed
    }, []);
    
    // While checking subscription status, show nothing or a loading indicator
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }
    
    // If subscription is expired or none and we're on a restricted page, show the popup
    const isRestricted = status?.status === "expired" || status?.status === "none";
    
    if (isRestricted && isRestrictedPage(window.location.pathname)) {
        return (
            <>
                <SubscriptionExpiryPopup 
                    daysRemaining={status.daysRemaining}
                    expiryDate={status.expiryDate}
                    status={status.status}
                />
                <div className="opacity-20 pointer-events-none">
                    {children}
                </div>
            </>
        );
    }
    
    // Otherwise, show the normal page content
    return children;
}