import AutoPaymentRecorder from "./features/finance/AutoPaymentRecorder";
import OfflineIndicator from "./components/OfflineIndicator";
import { OfflineProvider } from "./features/offline-mode/OfflineContext";
import { NotificationProvider } from "./features/Notifications/NotificationContext";
import { PWAInstallPrompt } from "./components/ui/pwa-install";

export default function AppAuthedProviders({ children }) {
  return (
    <NotificationProvider>
      <OfflineProvider>
        <AutoPaymentRecorder />
        <OfflineIndicator />
        <PWAInstallPrompt />
        {children}
      </OfflineProvider>
    </NotificationProvider>
  );
}

