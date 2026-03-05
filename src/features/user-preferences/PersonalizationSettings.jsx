import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { useUserPreferences, useUpdateUserPreferences } from '../../hooks/useUserPreferences';
import { Loader2, Check, Palette, Bell, Settings, RotateCcw, Clock, DollarSign, CreditCard, Smartphone, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { resetToDefaultSettings } from '../../services/apiAskTabibi';
import { useUserPreferencesContext } from './UserPreferencesProvider';

export function PersonalizationSettings() {
  const { data: preferences, isLoading } = useUserPreferences();
  const { mutate: updatePreferences, isPending } = useUpdateUserPreferences();
  const { applyColors, applyThemeMode } = useUserPreferencesContext();

  const [activeTab, setActiveTab] = useState('colors');
  const [colorState, setColorState] = useState({
    primary: '#1AA19C',
    secondary: '#224FB5',
    accent: '#FF6B6B',
  });

  const [themeMode, setThemeMode] = useState('light');
  const [sidebarLargeScreenBehavior, setSidebarLargeScreenBehavior] = useState('persistent');
  const [isResetting, setIsResetting] = useState(false);
  
  // Notification Settings State
  const [notificationTypes, setNotificationTypes] = useState({
    appointments: true,
    financial: true,
    subscription: true,
    apps: true,
    reminders: true,
    patients: true,
    system: true
  });
  const [toastEnabled, setToastEnabled] = useState(true);
  const [toastDuration, setToastDuration] = useState("3");
  const [hasChanges, setHasChanges] = useState(false);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);

  // Sync state with preferences when loaded
  useEffect(() => {
    if (preferences) {
      setColorState({
        primary: preferences.primary_color || '#1AA19C',
        secondary: preferences.secondary_color || '#224FB5',
        accent: preferences.accent_color || '#FF6B6B',
      });
      setThemeMode(preferences.theme_mode || 'light');
      setSidebarLargeScreenBehavior(preferences.sidebar_large_screen_behavior || 'persistent');
      
      // Notifications sync
      setNotificationTypes(prev => ({
        ...prev,
        ...(preferences.notification_types || {})
      }));
      setToastEnabled(preferences.toast_notifications_enabled !== false);
      setToastDuration(String(preferences.toast_duration || 3));
    }
  }, [preferences]);

  // Handlers for Notifications
  const handleTypeChange = (type, checked) => {
    setNotificationTypes(prev => ({ ...prev, [type]: checked }));
    setHasChanges(true);
  };

  const handleToastEnabledChange = (checked) => {
    setToastEnabled(checked);
    setHasChanges(true);
  };

  const handleToastDurationChange = (value) => {
    setToastDuration(value);
    setHasChanges(true);
  };

  const handleSaveNotificationSettings = () => {
    // Validation
    if (toastEnabled) {
      const durationNum = parseInt(toastDuration, 10);
      if (!toastDuration || isNaN(durationNum) || durationNum < 1 || durationNum > 60) {
        toast.error("يرجى إدخال مدة صحيحة للإشعارات (بين 1 و 60 ثانية)");
        return;
      }
    }

    setIsSavingNotifications(true);
    updatePreferences({
      notification_types: notificationTypes,
      toast_notifications_enabled: toastEnabled,
      toast_duration: parseInt(toastDuration, 10) || 3
    }, {
      onSuccess: () => {
        toast.success("تم حفظ إعدادات الإشعارات بنجاح");
        setHasChanges(false);
        setIsSavingNotifications(false);
      },
      onError: () => {
        toast.error("حدث خطأ أثناء حفظ الإعدادات");
        setIsSavingNotifications(false);
      }
    });
  };

  const handleResetToDefaults = async () => {
    if (!confirm('هل أنت متأكد من إعادة كل الإعدادات للوضع الافتراضي؟')) {
      return;
    }
    
    setIsResetting(true);
    try {
      const result = await resetToDefaultSettings();
      // Apply defaults immediately
      const defaultColors = { primary: '#1AA19C', secondary: '#224FB5', accent: '#FF6B6B' };
      applyColors(defaultColors.primary, defaultColors.secondary, defaultColors.accent);
      applyThemeMode('light');
      // Update local state
      setColorState(defaultColors);
      setThemeMode('light');
      setSidebarLargeScreenBehavior('persistent');
      
      // Reset notifications state
      setNotificationTypes({
        appointments: true,
        financial: true,
        subscription: true,
        apps: true,
        reminders: true,
        patients: true,
        system: true
      });
      setToastEnabled(true);
      setToastDuration("3");
      setHasChanges(false);

      toast.success(result.message);
    } catch (error) {
      toast.error('حدث خطأ في إعادة الإعدادات');
      console.error(error);
    } finally {
      setIsResetting(false);
    }
  };

  const handleSaveColors = () => {
    updatePreferences({
      primary_color: colorState.primary,
      secondary_color: colorState.secondary,
      accent_color: colorState.accent,
    }, {
      onSuccess: () => {
        // Apply colors immediately
        applyColors(colorState.primary, colorState.secondary, colorState.accent);
        toast.success('تم حفظ وتطبيق الألوان بنجاح');
      },
      onError: () => {
        toast.error('حدث خطأ في حفظ الألوان');
      },
    });
  };

  const handleThemeModeChange = (mode) => {
    setThemeMode(mode);
    // Apply theme immediately
    applyThemeMode(mode);
    updatePreferences(
      { theme_mode: mode },
      {
        onSuccess: () => {
          toast.success('تم تحديث المظهر');
        },
      }
    );
  };

  const handleSidebarLargeScreenBehaviorChange = (value) => {
    setSidebarLargeScreenBehavior(value);
    updatePreferences(
      { sidebar_large_screen_behavior: value },
      {
        onSuccess: () => {
          toast.success('تم تحديث سلوك القائمة');
        },
        onError: () => {
          toast.error('حدث خطأ في تحديث سلوك القائمة');
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-2xl font-bold mb-1">تخصيص المظهر</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            خصص ألوان ومظهر الواجهة
          </p>
        </div>
        <Button
          onClick={handleResetToDefaults}
          disabled={isResetting}
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive w-full sm:w-auto"
        >
          {isResetting ? (
            <>
              <Loader2 className="w-4 h-4 ml-1.5 animate-spin" />
              جاري الإعادة...
            </>
          ) : (
            <>
              <RotateCcw className="w-4 h-4 ml-1.5" />
              إعادة للوضع الافتراضي
            </>
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="colors" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-1 sm:px-3 text-[10px] sm:text-sm">
            <Palette className="w-4 h-4" />
            <span>الألوان</span>
          </TabsTrigger>
          <TabsTrigger value="theme" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-1 sm:px-3 text-[10px] sm:text-sm">
            <Settings className="w-4 h-4" />
            <span>المظهر</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-1 sm:px-3 text-[10px] sm:text-sm">
            <Bell className="w-4 h-4" />
            <span>الاشعارات</span>
          </TabsTrigger>
        </TabsList>

        {/* Colors Tab */}
        <TabsContent value="colors" className="space-y-4 mt-4">
          <Card className="p-3 sm:p-6">
            <div className="space-y-5">
              {/* Primary Color */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">اللون الأساسي</Label>
                <div className="flex items-center gap-2 sm:gap-4">
                  <input
                  type="color"
                  value={colorState.primary}
                  onChange={(e) => setColorState({ ...colorState, primary: e.target.value })}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-[var(--radius)] cursor-pointer border-2 border-border"
                />
                  <Input
                    value={colorState.primary}
                    onChange={(e) => setColorState({ ...colorState, primary: e.target.value })}
                    placeholder="#1AA19C"
                    className="flex-1 max-w-[120px] text-sm"
                  />
                  <div
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-[var(--radius)] border-2 border-border shadow-inner"
                    style={{ backgroundColor: colorState.primary }}
                  />
                </div>
              </div>

              {/* Secondary Color */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">اللون الثانوي</Label>
                <div className="flex items-center gap-2 sm:gap-4">
                  <input
                    type="color"
                    value={colorState.secondary}
                    onChange={(e) => setColorState({ ...colorState, secondary: e.target.value })}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg cursor-pointer border-2 border-border"
                  />
                  <Input
                    value={colorState.secondary}
                    onChange={(e) => setColorState({ ...colorState, secondary: e.target.value })}
                    placeholder="#224FB5"
                    className="flex-1 max-w-[120px] text-sm"
                  />
                  <div
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-[var(--radius)] border-2 border-border shadow-inner"
                    style={{ backgroundColor: colorState.secondary }}
                  />
                </div>
              </div>

              {/* Accent Color */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">لون التركيز</Label>
                <div className="flex items-center gap-2 sm:gap-4">
                  <input
                  type="color"
                  value={colorState.accent}
                  onChange={(e) => setColorState({ ...colorState, accent: e.target.value })}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-[var(--radius)] cursor-pointer border-2 border-border"
                />
                  <Input
                    value={colorState.accent}
                    onChange={(e) => setColorState({ ...colorState, accent: e.target.value })}
                    placeholder="#FF6B6B"
                    className="flex-1 max-w-[120px] text-sm"
                  />
                  <div
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg border-2 border-border shadow-inner"
                    style={{ backgroundColor: colorState.accent }}
                  />
                </div>
              </div>

              <Button
                onClick={handleSaveColors}
                disabled={isPending}
                className="w-full"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 ml-2" />
                    حفظ الألوان
                  </>
                )}
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Theme Tab */}
        <TabsContent value="theme" className="space-y-4 mt-4">
          <Card className="p-3 sm:p-6">
            <div className="space-y-4">
              <div>
                <Label className="mb-3 block text-sm font-medium">المظهر</Label>
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  {[
                    { value: 'light', label: 'فاتح', icon: '☀️' },
                    { value: 'dark', label: 'داكن', icon: '🌙' },
                    { value: 'system', label: 'تلقائي', icon: '💻' },
                  ].map((theme) => (
                    <button
                      key={theme.value}
                      onClick={() => handleThemeModeChange(theme.value)}
                      className={cn(
                        'p-3 sm:p-4 rounded-[var(--radius)] border-2 transition-all text-center',
                        themeMode === theme.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <p className="text-xl sm:text-2xl mb-1">{theme.icon}</p>
                      <p className="font-semibold text-xs sm:text-sm">{theme.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="block text-sm font-medium">القائمة الجانبية على الشاشات الكبيرة</Label>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  على الموبايل تظل بزرار عند الضغط، وعلى الشاشات الكبيرة تختار السلوك المناسب
                </p>
                <div className="max-w-sm">
                  <Select
                    value={sidebarLargeScreenBehavior}
                    onValueChange={handleSidebarLargeScreenBehaviorChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر السلوك" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="persistent">مفتوحة دائمًا</SelectItem>
                      <SelectItem value="toggle">زر (تفتح عند الضغط)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4 mt-4">
          {/* Notification Types Section */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4 sm:p-6 border-b border-border/50 bg-gradient-to-l from-purple-500/5 to-transparent flex justify-between items-center" dir="rtl">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-[var(--radius)] bg-purple-500/10">
                    <Bell className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-right">
                    <h3 className="font-semibold text-foreground">تخصيص الإشعارات</h3>
                    <p className="text-sm text-muted-foreground">تحكم في أنواع الإشعارات التي تصلك</p>
                  </div>
                </div>
                {hasChanges && (
                  <Button onClick={handleSaveNotificationSettings} disabled={isSavingNotifications} className="gap-2">
                     {isSavingNotifications && <Loader2 className="w-4 h-4 animate-spin" />}
                     حفظ التغييرات
                  </Button>
                )}
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                {[
                  { id: 'appointments', label: 'الحجوزات والمواعيد', icon: Clock },
                  { id: 'financial', label: 'التعاملات المالية', icon: DollarSign },
                  { id: 'subscription', label: 'اشتراك الباقة', icon: CreditCard },
                  { id: 'apps', label: 'تطبيقات طبيبي', icon: Smartphone },
                  { id: 'reminders', label: 'التذكيرات', icon: Bell },
                  { id: 'patients', label: 'المرضى', icon: Check },
                  { id: 'system', label: 'النظام والتنبيهات', icon: MessageSquare },
                ].map((type) => (
                   <div key={type.id} className="flex items-center justify-between p-3 rounded-md border bg-card/50" dir="rtl">
                      <div className="flex items-center gap-3">
                        <type.icon className="w-4 h-4 text-muted-foreground" />
                        <Label className="cursor-pointer font-medium text-right" htmlFor={`notify-${type.id}`}>{type.label}</Label>
                      </div>
                      <Switch 
                        id={`notify-${type.id}`}
                        checked={notificationTypes[type.id] ?? true}
                        onCheckedChange={(checked) => handleTypeChange(type.id, checked)}
                      />
                   </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Toast Settings Section */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4 sm:p-6 border-b border-border/50 bg-gradient-to-l from-orange-500/5 to-transparent flex justify-between items-center" dir="rtl">
                 <div className="flex items-center gap-3">
                  <div className="p-2 rounded-[var(--radius)] bg-orange-500/10">
                    <MessageSquare className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="text-right">
                    <h3 className="font-semibold text-foreground">إشعارات الشاشة (Toasts)</h3>
                    <p className="text-sm text-muted-foreground">تحكم في ظهور الإشعارات المنبثقة ومدة ظهورها</p>
                  </div>
                </div>
                {hasChanges && (
                  <Button onClick={handleSaveNotificationSettings} disabled={isSavingNotifications} className="gap-2">
                     {isSavingNotifications && <Loader2 className="w-4 h-4 animate-spin" />}
                     حفظ التغييرات
                  </Button>
                )}
              </div>
              <div className="p-4 sm:p-6 space-y-6">
                 <div className="flex items-center justify-between p-4 rounded-[var(--radius)] bg-muted/30 border border-border/50" dir="rtl">
                    <div className="space-y-0.5 text-right">
                      <Label className="text-base font-medium">إظهار الإشعارات المنبثقة</Label>
                      <p className="text-sm text-muted-foreground">عرض رسائل صغيرة أسفل الشاشة عند حدوث إجراء</p>
                    </div>
                    <Switch 
                      checked={toastEnabled}
                      onCheckedChange={handleToastEnabledChange}
                    />
                 </div>
                 
                 {toastEnabled && (
                   <div className="space-y-3 animate-in slide-in-from-top-2 p-4 rounded-[var(--radius)] bg-muted/30 border border-border/50" dir="rtl">
                     <Label className="block text-right">مدة ظهور الإشعار (بالثواني)</Label>
                     <div className="flex items-center gap-4">
                       <Input 
                          type="number" 
                          min="1" 
                          max="60" 
                          value={toastDuration}
                          onChange={(e) => handleToastDurationChange(e.target.value)}
                          className="w-24 text-right"
                       />
                     </div>
                   </div>
                 )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
