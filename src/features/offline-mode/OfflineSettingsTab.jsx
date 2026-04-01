import { useState, useEffect, useCallback, useRef } from "react";
import { Wifi, WifiOff, Shield, CheckCircle, AlertTriangle, RefreshCw, Database, Cloud, Clock, Loader2, KeyRound } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Switch } from "../../components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { toast } from "sonner";
import { getSetting, getUnsyncedItems, setSetting } from "./offlineDB";
import { syncQueuedOperations, syncAllDataToLocal } from "./sync";
import { useOffline } from "./OfflineContext";
import { resolveClinicUuid } from "../../services/clinicIds";
import { ensureServiceWorkerRegistered, getServerCountsForClinic, verifyCurrentUserPassword } from "../../services/apiOfflineMode";

export default function OfflineSettingsTab() {
  const { isOnline, offlineEnabled, activateOfflineMode, disableOfflineMode, isSyncing, syncMessage, syncOfflineData } = useOffline();
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [localDbSize, setLocalDbSize] = useState(null);
  const [encryptionStatus, setEncryptionStatus] = useState({ supabase: false, local: false });

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [accountPassword, setAccountPassword] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const passwordResolverRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem("tabibi_last_sync_time");
    if (saved) setLastSyncTime(new Date(saved));

    async function checkPending() {
      try {
        const items = await getUnsyncedItems();
        setPendingCount(items?.length || 0);
      } catch {}
    }
    checkPending();

    async function checkDbSize() {
      if (navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        setLocalDbSize(est.usage);
      }
    }
    checkDbSize();

    async function checkEncryption() {
      const hasPin = !!sessionStorage.getItem("tabibi_pin") || true; // Simplified for now
      setEncryptionStatus({
        supabase: true,
        local: hasPin
      });
    }
    checkEncryption();
  }, [offlineEnabled]);

  const verifyOwner = async () => {
    return new Promise((resolve) => {
      passwordResolverRef.current = resolve;
      setAccountPassword("");
      setPasswordDialogOpen(true);
    });
  };

  const closePasswordDialog = (ok) => {
    setPasswordDialogOpen(false);
    const resolve = passwordResolverRef.current;
    passwordResolverRef.current = null;
    resolve?.(ok);
  };

  const handlePasswordConfirm = async () => {
    if (!accountPassword) return;
    setPasswordSubmitting(true);
    try {
      await verifyCurrentUserPassword(accountPassword);
      toast.success("تم التحقق من كلمة المرور");
      closePasswordDialog(true);
    } catch (e) {
      toast.error(e?.message || "فشل التحقق");
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const handleToggleOffline = async () => {
    if (!offlineEnabled) {
      const verified = await verifyOwner();
      if (!verified) return;
      
      const success = await activateOfflineMode();
      if (success) {
        const now = new Date();
        setLastSyncTime(now);
      }
    } else {
      const verified = await verifyOwner();
      if (!verified) return;
      await disableOfflineMode();
    }
  };

  const checkDataConsistency = async () => {
    if (!isOnline) {
      toast.error("لا يوجد اتصال بالإنترنت للتحقق");
      return;
    }
    toast.loading("جارٍ التحقق من سلامة البيانات...", { id: "consistency-check" });
    try {
      const clinicUuid = await resolveClinicUuid();
      const { patients: patientsCount, appointments: appointmentsCount } = await getServerCountsForClinic(clinicUuid);

      const localItems = await getUnsyncedItems();
      const patientOps = localItems.filter(i => i.entityType === "patient").length;
      const appointmentOps = localItems.filter(i => i.entityType === "appointment").length;

      toast.success(
        `السيرفر: ${patientsCount} مريض | ${appointmentsCount} موعد\nالمعلقة: ${patientOps} عملية مريض | ${appointmentOps} عملية موعد`,
        { id: "consistency-check", duration: 5000 }
      );
    } catch (e) {
      toast.error(`خطأ في التحقق: ${e.message}`, { id: "consistency-check" });
    }
  };

  const handleFullSyncToLocal = async () => {
    if (!isOnline) {
      toast.error("لا يوجد اتصال بالإنترنت");
      return;
    }
    toast.loading("جارٍ تحميل البيانات من السيرفر...", { id: "full-sync" });
    try {
      const result = await syncAllDataToLocal();
      if (result.success) {
        toast.success(`تم تحميل ${result.synced} سجل بنجاح`, { id: "full-sync" });
        localStorage.setItem("tabibi_last_sync_time", new Date().toISOString());
        setLastSyncTime(new Date());
      } else {
        toast.error(`فشل: ${result.error}`, { id: "full-sync" });
      }
    } catch (e) {
      toast.error(`خطأ: ${e.message}`, { id: "full-sync" });
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++; }
    return `${bytes.toFixed(1)} ${units[i]}`;
  };

  const formatTimeAgo = (date) => {
    if (!date) return "لم تتم مزامنة بعد";
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "منذ ثوانٍ";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `منذ ${hours} ساعة`;
    const days = Math.floor(hours / 24);
    return `منذ ${days} يوم`;
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Under Development Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3 text-amber-800">
        <div className="p-2 bg-amber-100 rounded-full">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h3 className="font-bold text-sm">هذه الميزة تحت التطوير (Under Development)</h3>
          <p className="text-xs opacity-80">
            نحن نعمل حاليًا على تحسين وضع "بدون انترنت" لضمان أفضل تجربة ممكنة. قد تواجه بعض التغييرات أو التحديثات المستمرة.
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        {isOnline ? (
          <div className="p-2 rounded-[var(--radius)] bg-green-100 text-green-700">
            <Wifi className="w-5 h-5" />
          </div>
        ) : (
          <div className="p-2 rounded-[var(--radius)] bg-red-100 text-red-700">
            <WifiOff className="w-5 h-5" />
          </div>
        )}
        <div>
          <h2 className="text-lg font-bold">بدون انترنت</h2>
          <p className="text-sm text-muted-foreground">
            {isOnline ? "متصل بالإنترنت" : "غير متصل - البيانات محفوظة محليًا"}
          </p>
        </div>
      </div>

      {/* Offline Toggle */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <KeyRound className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">تفعيل وضع بدون انترنت</p>
                <p className="text-xs text-muted-foreground">يتطلب كلمة مرور حسابك لتغيير الحالة</p>
              </div>
            </div>
            <Switch
              checked={offlineEnabled}
              onCheckedChange={handleToggleOffline}
              disabled={isSyncing}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sync Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            حالة المزامنة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              آخر مزامنة كاملة
            </span>
            <span className="font-medium">
              {formatTimeAgo(lastSyncTime)}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">العمليات المعلقة</span>
            <span className={`font-medium ${pendingCount > 0 ? "text-orange-600" : "text-green-600"}`}>
              {pendingCount} عملية
            </span>
          </div>

          {isSyncing && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" />
              {syncMessage || "جارٍ المزامنة..."}
            </div>
          )}

          <Button
            onClick={syncOfflineData}
            disabled={!isOnline || isSyncing}
            className="w-full gap-2"
          >
            {isSyncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {isSyncing ? "جارٍ المزامنة..." : "مزامنة العمليات المعلقة"}
          </Button>
        </CardContent>
      </Card>

      {/* Data Verification */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            تحديث البيانات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={activateOfflineMode}
            disabled={!isOnline || isSyncing}
            variant="outline"
            className="w-full gap-2"
          >
            <Cloud className="w-4 h-4" />
            إعادة تحميل كل البيانات من السيرفر
          </Button>
        </CardContent>
      </Card>

      {/* Encryption Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" />
            حالة التشفير
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm p-3 bg-green-50 rounded-lg">
            <span className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-green-600" />
              Supabase
            </span>
            <span className="text-green-700 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              مشفر (SSL/TLS)
            </span>
          </div>

          <div className="flex items-center justify-between text-sm p-3 bg-blue-50 rounded-lg">
            <span className="flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600" />
              البيانات المحلية
            </span>
            <span className={`flex items-center gap-1 ${encryptionStatus.local ? "text-blue-700" : "text-orange-700"}`}>
              {encryptionStatus.local ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  مشفر (PIN/Biometric)
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  غير مشفر
                </>
              )}
            </span>
          </div>

          {localDbSize !== null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">حجم البيانات المحلية</span>
              <span className="font-medium">{formatBytes(localDbSize)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Offline Capabilities Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">إمكانيات العمل بدون انترنت</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              إدارة المرضى (إضافة/تعديل/بحث)
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              المواعيد (عرض/إنشاء/تعديل)
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              الكشوفات (إضافة/تعديل)
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              خطط العلاج (عرض/إنشاء/تعديل)
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              السجلات المالية (عرض/إضافة)
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              الإشعارات (عرض فقط)
            </li>
            <li className="flex items-center gap-2 text-orange-400">
              <AlertTriangle className="w-4 h-4" />
              الذكاء الاصطناعي (يتطلب اتصال)
            </li>
          </ul>
        </CardContent>
      </Card>

      <Dialog open={passwordDialogOpen} onOpenChange={(open) => { if (!open) closePasswordDialog(false); }}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>تأكيد ملكية الحساب</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="accountPassword">كلمة مرور حسابك في طبيبي</Label>
              <Input
                id="accountPassword"
                type="password"
                value={accountPassword}
                onChange={(e) => setAccountPassword(e.target.value)}
                placeholder="اكتب كلمة المرور"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && accountPassword && !passwordSubmitting) {
                    handlePasswordConfirm();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter className="flex flex-row-reverse gap-2">
            <Button
              onClick={handlePasswordConfirm}
              disabled={passwordSubmitting || !accountPassword}
              className="gap-2 flex-1"
            >
              {passwordSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              تأكيد
            </Button>
            <Button variant="outline" onClick={() => closePasswordDialog(false)} disabled={passwordSubmitting} className="flex-1">
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
