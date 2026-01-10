import { useState, useEffect } from "react";
import { Bell, Mail, Clock, Check, Loader2, MessageSquare, Smartphone } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { 
  getDailyEmailSettings, 
  updateDailyEmailSettings 
} from "../../services/apiUserPreferences";
import { useUserPreferences, useUpdateUserPreferences } from "../../hooks/useUserPreferences";
import { getMessagingInstance, getToken } from "../../lib/firebase";
import supabase from "../../services/supabase";
import { useAuth } from "../auth";
import toast from "react-hot-toast";
import { cn } from "../../lib/utils";

export default function NotificationsTab() {
  const { user } = useAuth();
  const { data: preferences } = useUserPreferences();
  const { mutate: updatePreferences } = useUpdateUserPreferences();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Push Notification State
  const [pushLoading, setPushLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState("default");

  // Global preference for notifications
  const pushEnabled = preferences?.notifications_enabled ?? false;

  const [settings, setSettings] = useState({
    enabled: false,
    time: "07:00",
    timezone: "Africa/Cairo"
  });

  // Load settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await getDailyEmailSettings();
        setSettings(data);
        
        // Check push notification status
        if ('Notification' in window) {
          setPermissionStatus(Notification.permission);
        }
      } catch (error) {
        console.error("Error loading email settings:", error);
        toast.error("فشل في تحميل الإعدادات");
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  // Helper: Save token to DB
  const saveTokenToDB = async (token) => {
    try {
      const { error } = await supabase
        .from('fcm_tokens')
        .upsert({ 
          user_id: user.id, 
          token: token,
          device_type: 'web',
          last_updated: new Date().toISOString()
        }, { onConflict: 'user_id, token' });
      
      if (error) throw error;
    } catch (error) {
      console.error("Error saving FCM token:", error);
    }
  };

  // Helper: Delete token from DB
  const deleteTokenFromDB = async (token) => {
    try {
      const { error } = await supabase
        .from('fcm_tokens')
        .delete()
        .eq('token', token)
        .eq('user_id', user.id);
        
      if (error) throw error;
    } catch (error) {
      console.error("Error deleting FCM token:", error);
    }
  };

  // Handle Push Toggle
  const handlePushToggle = async (enabled) => {
    if (!('Notification' in window)) {
      toast.error("المتصفح لا يدعم الإشعارات");
      return;
    }

    setPushLoading(true);
    try {
      if (enabled) {
        // Enable
        const permission = await Notification.requestPermission();
        setPermissionStatus(permission);
        
        if (permission === 'granted') {
          const messaging = await getMessagingInstance();
          if (!messaging) {
            toast.error("فشل تهيئة الإشعارات");
            return;
          }
          
          // Try getting token
          // Note: If this fails with "missing required authentication credential",
          // it means a Web Push Certificate (VAPID Key) needs to be generated in Firebase Console
          let finalToken;
          try {
            finalToken = await getToken(messaging);
          } catch (err) {
            // Catch ALL errors during token retrieval (VAPID missing, network, etc)
            console.warn("FCM Token Error. VAPID Key might be missing in Firebase Console.", err);
            console.info("To fix: Go to Firebase Console -> Project Settings -> Cloud Messaging -> Web Configuration -> Generate Key Pair.");
            
            // Show friendly message to user
            toast.error("عفواً، خدمة الإشعارات تحتاج إلى تفعيل من إعدادات النظام (VAPID Key). يرجى مراجعة الدعم الفني.");
            return; // Stop execution, don't throw to outer catch
          }
          
          if (finalToken) {
            await saveTokenToDB(finalToken);
            // Update global preference
            updatePreferences({ notifications_enabled: true });
            toast.success("تم تفعيل الإشعارات بنجاح");
          } else {
            toast.error("فشل الحصول على رمز الإشعارات");
          }
        } else {
          // User denied permission
          toast.error("يجب السماح الإشعارات من إعدادات المتصفح");
        }
      } else {
        // Disable
        const messaging = await getMessagingInstance();
        if (messaging) {
            const token = await getToken(messaging).catch(() => null);
            if (token) {
                await deleteTokenFromDB(token);
            }
        }
        // Update global preference
        updatePreferences({ notifications_enabled: false });
        toast.success("تم إيقاف الإشعارات");
      }
    } catch (error) {
      console.error("Error toggling push notifications:", error);
      toast.error("حدث خطأ أثناء تغيير الإعدادات");
    } finally {
      setPushLoading(false);
    }
  };

  // Handle toggle change
  const handleToggle = async (enabled) => {
    setIsSaving(true);
    try {
      await updateDailyEmailSettings({ enabled });
      setSettings(prev => ({ ...prev, enabled }));
      toast.success(enabled ? "تم تفعيل إرسال المواعيد اليومية" : "تم إيقاف إرسال المواعيد اليومية");
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("فشل في تحديث الإعدادات");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle time change
  const handleTimeChange = async (time) => {
    setSettings(prev => ({ ...prev, time }));
  };

  // Save time
  const handleSaveTime = async () => {
    setIsSaving(true);
    try {
      await updateDailyEmailSettings({ time: settings.time });
      toast.success(`سيتم إرسال المواعيد الساعة ${settings.time}`);
    } catch (error) {
      console.error("Error updating time:", error);
      toast.error(error.message || "فشل في تحديث الوقت");
    } finally {
      setIsSaving(false);
    }
  };

  // Format time for display
  const formatTimeDisplay = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'مساءً' : 'صباحًا';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Push Notifications Section */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-border/50 bg-gradient-to-r from-blue-500/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-[var(--radius)] bg-blue-500/10">
                <Smartphone className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">إشعارات التطبيق</h3>
                <p className="text-sm text-muted-foreground">استقبال تنبيهات بالحجوزات الجديدة على هذا الجهاز</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 space-y-6">
            <div className="flex items-center justify-between gap-4 p-4 rounded-[var(--radius)] bg-muted/30 border border-border/50">
              <div className="flex items-center gap-3">
                <Bell className={cn(
                  "w-5 h-5 transition-colors",
                  pushEnabled ? "text-primary" : "text-muted-foreground"
                )} />
                <div>
                  <Label className="text-base font-medium">تفعيل الإشعارات</Label>
                  <p className="text-sm text-muted-foreground">
                    {pushEnabled 
                      ? "الإشعارات مفعلة على هذا المتصفح"
                      : permissionStatus === 'denied' 
                        ? "تم حظر الإشعارات من إعدادات المتصفح"
                        : "استقبل تنبيه فوري عند وجود حجز جديد"
                    }
                  </p>
                </div>
              </div>
              <Switch
                checked={pushEnabled}
                onCheckedChange={handlePushToggle}
                disabled={pushLoading || permissionStatus === 'denied'}
              />
            </div>
            
            {permissionStatus === 'denied' && (
               <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md">
                  تنبيه: لقد قمت بحظر الإشعارات سابقاً. لتفعيلها مرة أخرى، يرجى تغيير إعدادات الموقع في المتصفح (اضغط على علامة القفل بجوار الرابط).
               </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Daily Email Section */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-[var(--radius)] bg-primary/10">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">إرسال المواعيد اليومية</h3>
                <p className="text-sm text-muted-foreground">احصل على مواعيدك اليومية على الإيميل</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 space-y-6">
            {/* Enable Toggle */}
            <div className="flex items-center justify-between gap-4 p-4 rounded-[var(--radius)] bg-muted/30 border border-border/50">
              <div className="flex items-center gap-3">
                <Bell className={cn(
                  "w-5 h-5 transition-colors",
                  settings.enabled ? "text-primary" : "text-muted-foreground"
                )} />
                <div>
                  <Label className="text-base font-medium">تفعيل الإرسال اليومي</Label>
                  <p className="text-sm text-muted-foreground">
                    {settings.enabled 
                      ? `سيتم إرسال مواعيدك الساعة ${formatTimeDisplay(settings.time)}`
                      : "مش هيوصلك إيميل بمواعيدك"
                    }
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={handleToggle}
                disabled={isSaving}
              />
            </div>

            {/* Time Selection - Only show if enabled */}
            {settings.enabled && (
              <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                <Label className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  وقت الإرسال
                </Label>
                <div className="flex gap-3 w-full">
                  <Input
                    type="time"
                    value={settings.time}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    className="w-[75%]"
                  />
                  <Button
                    variant="outline"
                    onClick={handleSaveTime}
                    disabled={isSaving}
                    className="w-[25%] gap-2"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    حفظ
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  التوقيت حسب منطقة القاهرة (Africa/Cairo)
                </p>
              </div>
            )}

            {/* Email Info */}
            <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-700 dark:text-blue-300">
                    سيتم الإرسال على
                  </p>
                  <p className="text-blue-600 dark:text-blue-400 mt-1">
                    {user?.email || "الإيميل المسجل بحسابك"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Settings Removed */}
    </div>
  );
}
