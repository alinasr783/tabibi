import { useEffect, useState } from 'react';
import { useOffline } from '../features/offline-mode/OfflineContext';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export default function OfflineIndicator() {
  // Add a try-catch block to handle cases where the hook is used outside the provider
  let isOnline = true;
  let isSyncing = false;
  let syncProgress = 0;
  let syncMessage = '';
  let hasOfflineContext = false;
  
  try {
    const offlineContext = useOffline();
    isOnline = offlineContext.isOnline;
    isSyncing = offlineContext.isSyncing;
    syncProgress = offlineContext.syncProgress;
    syncMessage = offlineContext.syncMessage;
    hasOfflineContext = true;
  } catch (error) {
    // If we're outside the OfflineProvider, we'll default to online mode
    console.warn("OfflineIndicator used outside OfflineProvider, defaulting to online mode");
  }
  
  const [isVisible, setIsVisible] = useState(false);
  const [showOnlineMessage, setShowOnlineMessage] = useState(false);

  useEffect(() => {
    // Show indicator when offline or syncing
    if (!hasOfflineContext) {
      setIsVisible(false);
      return;
    }
    
    if (!isOnline || isSyncing) {
      setIsVisible(true);
      setShowOnlineMessage(false);
    } else {
      // When back online, show success message for 3 seconds then hide
      setShowOnlineMessage(true);
      setIsVisible(true);
      
      const timer = setTimeout(() => {
        setIsVisible(false);
        setShowOnlineMessage(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isOnline, isSyncing, hasOfflineContext]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 flex items-center space-x-3">
        {!isOnline ? (
          <>
            <WifiOff className="text-red-500 w-5 h-5" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              أنت غير متصل بالإنترنت حاليًا، سيتم حفظ التغييرات ومزامنتها تلقائيًا عند عودة الاتصال.
            </span>
          </>
        ) : isSyncing ? (
          <>
            <RefreshCw className="text-blue-500 w-5 h-5 animate-spin" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {syncMessage || 'جارٍ المزامنة...'}
              </span>
              {syncProgress > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                  <div 
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                    style={{ width: `${syncProgress}%` }}
                  ></div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Wifi className="text-green-500 w-5 h-5" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              تم استعادة الاتصال بالإنترنت
            </span>
          </>
        )}
      </div>
    </div>
  );
}