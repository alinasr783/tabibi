import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useUserPreferences, useUpdateUserPreferences } from '../../hooks/useUserPreferences';
import { Loader2, Check, Palette, Bell, Settings, RotateCcw } from 'lucide-react';
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
    }
  }, [preferences]);

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
            <span>الإخطارات</span>
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
          <Card className="p-3 sm:p-6">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="w-10 h-10 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground text-sm">
                إعدادات الإخطارات قريباً
              </p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
