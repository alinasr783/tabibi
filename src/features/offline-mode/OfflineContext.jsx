import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { db, getUnsyncedItems, addToQueue } from './offlineDB';
import { useAuth } from '../auth';
import { toast } from 'sonner';
import { syncQueuedOperations, syncAllDataToLocal } from './sync';

const OfflineContext = createContext();

export function OfflineProvider({ children }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncMessage, setSyncMessage] = useState('');
  const { user } = useAuth();
  const [initialized, setInitialized] = useState(false);
  const [lastSyncAttemptAt, setLastSyncAttemptAt] = useState(0);
  const [offlineEnabled, setOfflineEnabledState] = useState(() => {
    try {
      const enabled = localStorage.getItem("tabibi_offline_enabled") === "true";
      console.log("[OfflineProvider] Initial offlineEnabled state:", enabled);
      return enabled;
    } catch {
      return false
    }
  })

  // Log state changes to help debug
  useEffect(() => {
    console.log("[OfflineProvider] State changed - isOnline:", isOnline, "offlineEnabled:", offlineEnabled, "isOfflineMode:", offlineEnabled && !isOnline);
  }, [isOnline, offlineEnabled]);

  // Initialize the database
  useEffect(() => {
    const init = async () => {
      try {
        console.log('Initializing offline database (Dexie)...');
        await db.open();
        setInitialized(true);
        console.log('Offline database initialized successfully');
      } catch (error) {
        console.error('Failed to initialize offline database:', error);
        toast.error('فشل في تهيئة قاعدة البيانات المحلية');
      }
    };

    init();
  }, []);

  const syncOfflineData = useCallback(async () => {
    if (!offlineEnabled || !user || !initialized) return;

    const now = Date.now();
    if (now - lastSyncAttemptAt < 15000) return;
    setLastSyncAttemptAt(now);

    console.groupCollapsed('[OFFLINE_SYNC] syncOfflineData');
    setIsSyncing(true);
    setSyncProgress(0);
    setSyncMessage('جارٍ المزامنة...');

    try {
      const res = await syncQueuedOperations();
      setSyncProgress(100);
      setSyncMessage('تمت المزامنة بنجاح');
      setTimeout(() => {
        setIsSyncing(false);
        setSyncMessage('');
      }, 2000);
      if (res.synced > 0) {
        toast.success(`تمت مزامنة ${res.synced} عمليات بنجاح`);
      }
    } catch (error) {
      console.error('Error during sync:', error);
      setIsSyncing(false);
      setSyncMessage('فشلت المزامنة – إعادة المحاولة');
      toast.error(`فشلت المزامنة: ${error?.message || 'خطأ غير معروف'}`);
    } finally {
      try { console.groupEnd(); } catch {}
    }
  }, [offlineEnabled, user, initialized, lastSyncAttemptAt]);

  /**
   * Activates offline mode:
   * 1. Fetches all clinic data from Supabase.
   * 2. Stores it in IndexedDB.
   * 3. Enables offline mode state.
   */
  const activateOfflineMode = useCallback(async () => {
    if (!isOnline) {
      toast.error("يجب أن تكون متصلاً بالإنترنت لتفعيل هذا الوضع لأول مرة");
      return false;
    }

    setIsSyncing(true);
    setSyncMessage('جارٍ تحميل جميع بيانات العيادة...');
    
    try {
      // 1. & 2. & 3. Perform full sync (fetch and store)
      const syncResult = await syncAllDataToLocal();
      
      if (syncResult.success) {
        // 4. Update state
        setOfflineEnabledState(true);
        localStorage.setItem("tabibi_offline_enabled", "true");
        localStorage.setItem("tabibi_last_sync_time", new Date().toISOString());
        
        // 5. Notify user
        toast.success("تم تفعيل وضع بدون إنترنت وتحميل جميع بياناتك بنجاح");
        return true;
      } else {
        throw new Error(syncResult.error);
      }
    } catch (error) {
      console.error("Failed to activate offline mode:", error);
      toast.error(`فشل تفعيل وضع بدون إنترنت: ${error.message}`);
      
      // Revert if failed
      setOfflineEnabledState(false);
      localStorage.setItem("tabibi_offline_enabled", "false");
      return false;
    } finally {
      setIsSyncing(false);
      setSyncMessage('');
    }
  }, [isOnline]);

  const disableOfflineMode = useCallback(async () => {
    setOfflineEnabledState(false);
    localStorage.setItem("tabibi_offline_enabled", "false");
    toast.success("تم إيقاف وضع بدون إنترنت");
    return true;
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('تم استعادة الاتصال بالإنترنت');
      if (offlineEnabled) syncOfflineData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      if (offlineEnabled) {
        toast.warning('أنت غير متصل بالإنترنت حاليًا، يمكنك الاستمرار في العمل وسيتم حفظ التغييرات محليًا.');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [offlineEnabled, syncOfflineData]);

  // Periodic sync when online
  useEffect(() => {
    if (!offlineEnabled || !user || !initialized || !isOnline) return;
    
    const intervalId = setInterval(syncOfflineData, 60000); // Check every minute
    return () => clearInterval(intervalId);
  }, [offlineEnabled, user, initialized, isOnline, syncOfflineData]);

  const value = {
    isOnline,
    isOfflineMode: offlineEnabled && !isOnline,
    offlineEnabled,
    activateOfflineMode,
    disableOfflineMode,
    isSyncing,
    syncProgress,
    syncMessage,
    syncOfflineData
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}
