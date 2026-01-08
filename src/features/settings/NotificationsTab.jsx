import { useState, useEffect } from "react";
import { Bell, Mail, Clock, Check, Loader2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { 
  getDailyEmailSettings, 
  updateDailyEmailSettings 
} from "../../services/apiUserPreferences";
import { useAuth } from "../auth";
import toast from "react-hot-toast";
import { cn } from "../../lib/utils";

export default function NotificationsTab() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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
      } catch (error) {
        console.error("Error loading email settings:", error);
        toast.error("فشل في تحميل الإعدادات");
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

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
                <div className="flex gap-3">
                  <Input
                    type="time"
                    value={settings.time}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    className="max-w-[150px]"
                  />
                  <Button
                    variant="outline"
                    onClick={handleSaveTime}
                    disabled={isSaving}
                    className="gap-2"
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

      {/* Future: WhatsApp / SMS */}
      <Card className="opacity-60">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-[var(--radius)] bg-muted">
              <Bell className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">إشعارات WhatsApp & SMS</h3>
              <p className="text-sm text-muted-foreground">قريباً إن شاء الله...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
