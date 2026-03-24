import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { initDB, getUnsyncedItems, addToQueue } from './offlineDB';
import { useAuth } from '../auth';
import { toast } from 'react-hot-toast';
import { syncQueuedOperations } from './sync';

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
      return localStorage.getItem("tabibi_offline_enabled") === "true"
    } catch {
      return false
    }
  })

  const syncOfflineData = useCallback(async () => {
    if (!offlineEnabled || !user || !initialized) return;

    const now = Date.now();
    if (now - lastSyncAttemptAt < 15000) return;
    setLastSyncAttemptAt(now);

    console.groupCollapsed('[OFFLINE_SYNC] syncOfflineData');
    console.log('[OFFLINE_SYNC] starting', { initialized, hasUser: !!user });
    setIsSyncing(true);
    setSyncProgress(0);
    setSyncMessage('جارٍ المزامنة...');

    try {
      const unsyncedItems = await getUnsyncedItems();
      const totalItems = unsyncedItems.length;
      console.log('[OFFLINE_SYNC] items to sync:', totalItems);
      if (totalItems === 0) {
        setSyncMessage('تمت المزامنة بنجاح');
        setTimeout(() => {
          setIsSyncing(false);
          setSyncMessage('');
        }, 2000);
        console.groupEnd();
        return;
      }
      const res = await syncQueuedOperations();
      console.log('[OFFLINE_SYNC] syncQueuedOperations result', res);
      setSyncProgress(100);
      setSyncMessage('تمت المزامنة بنجاح');
      setTimeout(() => {
        setIsSyncing(false);
        setSyncMessage('');
      }, 2000);
      toast.success(`تمت مزامنة ${res.synced} من ${totalItems} عملية`);
    } catch (error) {
      console.error('Error during sync:', error);
      setIsSyncing(false);
      setSyncMessage('فشلت المزامنة – إعادة المحاولة');
      toast.error(`فشلت المزامنة: ${error?.message || 'خطأ غير معروف'}`);
    } finally {
      try { console.groupEnd(); } catch {}
    }
  }, [offlineEnabled, user, initialized, lastSyncAttemptAt]);

  // Initialize the database
  useEffect(() => {
    const init = async () => {
      try {
        console.log('Initializing offline database...');
        await initDB();
        if (!sessionStorage.getItem('tabibi_pin')) {
          sessionStorage.setItem('tabibi_pin', 'tabibi');
        }
        setInitialized(true);
        console.log('Offline database initialized successfully');
      } catch (error) {
        console.error('Failed to initialize offline database:', error);
        toast.error('فشل في تهيئة قاعدة البيانات المحلية');
      }
    };

    init();
  }, [offlineEnabled, syncOfflineData]);

  useEffect(() => {
    const handler = (e) => {
      const msg = e && e.data
      if (msg && msg.type === 'TABIBI_SYNC') {
        syncOfflineData()
      }
    }
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', handler)
    }
    return () => {
      if (navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener('message', handler)
      }
    }
  }, [syncOfflineData])

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('Online event detected');
      setIsOnline(true);
      toast.success('تم استعادة الاتصال بالإنترنت');
      if (offlineEnabled) syncOfflineData();
    };

    const handleOffline = () => {
      console.log('Offline event detected');
      setIsOnline(false);
      toast.error('أنت غير متصل بالإنترنت حاليًا، سيتم حفظ التغييرات ومزامنتها تلقائيًا عند عودة الاتصال.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!offlineEnabled || !user || !initialized) return;
    const tick = async () => {
      if (isSyncing) return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      try {
        const unsynced = await getUnsyncedItems();
        const count = Array.isArray(unsynced) ? unsynced.length : 0;
        if (count > 0) {
          console.log("[OFFLINE_SYNC] periodic check", { count });
          await syncOfflineData();
        }
      } catch (e) {
        console.warn("[OFFLINE_SYNC] periodic check failed", e);
      }
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [offlineEnabled, user, initialized, isSyncing, syncOfflineData]);

  // Function to add operation to offline queue
  const enqueueOperation = useCallback(async (entityType, operation, data, entityId = null) => {
    if (!offlineEnabled || !initialized) return;

    try {
      const queueItem = {
        entityType,
        operation,
        data,
        entityId,
        timestamp: new Date().toISOString()
      };

      // Add to offline queue
      await addToQueue(queueItem);
      const dataKeys = data && typeof data === "object" ? Object.keys(data).sort() : [];
      console.log('[OFFLINE_QUEUE] enqueued', { entityType, operation, entityId, dataKeysCount: dataKeys.length });
      if (navigator.serviceWorker) {
        navigator.serviceWorker.ready.then((reg) => {
          if ('sync' in reg) {
            reg.sync.register('tabibi-sync').catch(() => {})
          }
        })
      }
      
      // Show notification when offline
      if (!isOnline) {
        toast.success('تم حفظ التغييرات محليًا وسيتم مزامنتها تلقائيًا');
      }
    } catch (error) {
      console.error('Error enqueuing operation:', error);
      toast.error('فشل في حفظ التغييرات المحلية');
    }
  }, [offlineEnabled, initialized, isOnline]);

  // Function to check if we're in offline mode
  const isOfflineMode = offlineEnabled && !isOnline;

  const setOfflineEnabled = useCallback((next) => {
    setOfflineEnabledState(!!next)
    try {
      localStorage.setItem("tabibi_offline_enabled", next ? "true" : "false")
    } catch {}
  }, [])

  const value = {
    isOnline,
    isOfflineMode,
    offlineEnabled,
    setOfflineEnabled,
    isSyncing,
    syncProgress,
    syncMessage,
    enqueueOperation,
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
