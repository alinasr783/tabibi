# User Personalization Feature Documentation

## نظام تخصيص واجهة المستخدم الشخصية

### الميزات الرئيسية:
1. ✅ تخصيص الألوان (اللون الأساسي والثانوي والتركيز)
2. ✅ تخصيص نمط الشريط الجانبي
3. ✅ تخصيص المظهر (فاتح/داكن/تلقائي)
4. ✅ ترتيب عناصر المنيو حسب التفضيل
5. ✅ تخصيص أدوات لوحة التحكم
6. ✅ إعدادات الإخطارات المخصصة

---

## البنية التكنولوجية

### جدول قاعدة البيانات: `user_preferences`

```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY
  user_id UUID (مفتاح أجنبي)
  
  -- الألوان والمظهر
  theme_mode TEXT ('light', 'dark', 'system')
  primary_color VARCHAR(7) -- لون HEX
  secondary_color VARCHAR(7)
  accent_color VARCHAR(7)
  
  -- الواجهة
  logo_url TEXT
  company_name TEXT
  
  -- التخطيط والمنيو
  menu_items JSONB -- ترتيب العناصر
  sidebar_collapsed BOOLEAN
  sidebar_style TEXT ('default', 'compact', 'full')
  
  -- الإعدادات
  language TEXT ('ar', 'en')
  notifications_enabled BOOLEAN
  sound_notifications BOOLEAN
  dashboard_widgets JSONB
  
  created_at TIMESTAMP
  updated_at TIMESTAMP
)
```

### Row Level Security (RLS):
- ✅ يمكن للمستخدم قراءة تفضيلاته الخاصة فقط
- ✅ يمكن للمستخدم تحديث تفضيلاته الخاصة فقط
- ✅ الإنشاء التلقائي عند التسجيل

---

## API المتاح

### ملف: `src/services/apiUserPreferences.js`

```javascript
// جلب التفضيلات
getUserPreferences() -> Promise<preferences>

// تحديث التفضيلات الكاملة
updateUserPreferences(preferences) -> Promise<updated>

// تحديث المظهر
updateThemeMode(mode) -> Promise

// تحديث الألوان
updateColors(primary, secondary, accent) -> Promise

// تحديث ترتيب المنيو
updateMenuItemsOrder(items) -> Promise

// تحديث نمط الشريط الجانبي
updateSidebarStyle(style) -> Promise

// تحديث اللغة
updateLanguage(language) -> Promise

// تحديث إعدادات الإخطارات
updateNotificationPreferences(enabled, sound) -> Promise

// تحديث أدوات لوحة التحكم
updateDashboardWidgets(widgets) -> Promise

// تحديث المعلومات الشخصية
updateBranding(companyName, logoUrl) -> Promise

// تبديل حالة الشريط الجانبي
toggleSidebarCollapsed(collapsed) -> Promise
```

---

## الـ Hooks المتاح

### ملف: `src/hooks/useUserPreferences.js`

```javascript
// جلب التفضيلات
const { data: preferences, isLoading } = useUserPreferences()

// تحديث التفضيلات
const { mutate: updatePreferences, isPending } = useUpdateUserPreferences()

// جلب قيمة محددة
const value = usePreference('primary_color')

// تحديث قيمة محددة
const updateValue = useUpdatePreference('primary_color')
updateValue('#FF0000')
```

### Context API

```javascript
// استخدام ال Context
const preferences = useUserPreferencesContext()

// المتغيرات المتاحة:
preferences.primaryColor
preferences.secondaryColor
preferences.accentColor
preferences.themeMode
preferences.sidebarStyle
preferences.sidebarCollapsed
preferences.language
preferences.menuItems
preferences.dashboardWidgets
preferences.notificationsEnabled
preferences.soundNotifications
preferences.companyName
preferences.logoUrl
```

---

## المكونات الجاهزة

### PersonalizationSettings
مكون كامل لإدارة التفضيلات بتاب لكل فئة:
- 🎨 تخصيص الألوان
- 📐 تخطيط الواجهة
- 🌙 المظهر
- 🔔 الإخطارات (قريباً)

**الموقع:** `src/features/user-preferences/PersonalizationSettings.jsx`

---

## خطوات التنفيذ

### 1. تنفيذ Migration في Supabase
```bash
# انسخ محتوى هذا الملف:
migration-user-preferences.sql

# والصقه في Supabase SQL Editor
# ثم اضغط Execute
```

### 2. إضافة Provider إلى التطبيق

في `src/App.jsx`:
```jsx
import { UserPreferencesProvider } from './features/user-preferences/UserPreferencesContext';

<UserPreferencesProvider>
  {/* باقي التطبيق */}
</UserPreferencesProvider>
```

### 3. استخدام في الصفحات

في `src/pages/Settings.jsx`:
```jsx
import { PersonalizationSettings } from '../features/user-preferences/PersonalizationSettings';

export default function SettingsPage() {
  return (
    <div>
      {/* إعدادات أخرى */}
      <PersonalizationSettings />
    </div>
  );
}
```

### 4. الوصول للتفضيلات في المكونات

```jsx
import { useUserPreferencesContext } from '../features/user-preferences/UserPreferencesContext';

function MyComponent() {
  const prefs = useUserPreferencesContext();
  
  return (
    <div style={{ color: prefs.primaryColor }}>
      اللون الأساسي: {prefs.primaryColor}
    </div>
  );
}
```

---

## مثال عملي كامل

```jsx
// تحديث اللون الأساسي
const { mutate } = useUpdateUserPreferences();

mutate({
  primary_color: '#FF0000',
  theme_mode: 'dark',
  sidebar_style: 'compact'
});

// جلب التفضيلات والاستخدام
const prefs = useUserPreferencesContext();

<button style={{
  backgroundColor: prefs.primaryColor,
  color: prefs.secondaryColor
}}>
  اضغط هنا
</button>
```

---

## هيكل البيانات JSONB

### menu_items
```json
[
  {
    "id": "dashboard",
    "label": "لوحة التحكم",
    "order": 1,
    "enabled": true,
    "icon": "LayoutDashboard"
  },
  {
    "id": "appointments",
    "label": "المواعيد",
    "order": 2,
    "enabled": true,
    "icon": "Calendar"
  }
]
```

### dashboard_widgets
```json
[
  {
    "id": "widget_appointments",
    "order": 1,
    "enabled": true
  },
  {
    "id": "widget_revenue",
    "order": 2,
    "enabled": true
  }
]
```

---

## التكامل مع الألوان الديناميكية

في `src/index.css`:
```css
:root {
  --primary: var(--user-primary-color, hsl(187 85% 35%));
  --secondary: var(--user-secondary-color, hsl(224 76% 45%));
  --accent: var(--user-accent-color, hsl(0, 84%, 60%));
}
```

في المكون:
```jsx
useEffect(() => {
  const prefs = useUserPreferencesContext();
  document.documentElement.style.setProperty('--user-primary-color', prefs.primaryColor);
  document.documentElement.style.setProperty('--user-secondary-color', prefs.secondaryColor);
  document.documentElement.style.setProperty('--user-accent-color', prefs.accentColor);
}, [preferences]);
```

---

## ملاحظات مهمة

- ✅ البيانات محمية بـ RLS وكل مستخدم يرى بياناته فقط
- ✅ التفضيلات تُحفظ تلقائياً في قاعدة البيانات
- ✅ يمكن للمستخدمين الاختيار من خيارات محددة
- ✅ التفضيلات تُعاد تحميلها عند تحديث الصفحة
- ✅ الألوان تُحدّث فوراً بدون تأخير

---

## الملفات المنشأة

```
src/
├── services/
│   └── apiUserPreferences.js (107 أسطر)
├── hooks/
│   └── useUserPreferences.js (63 سطر)
└── features/
    └── user-preferences/
        ├── PersonalizationSettings.jsx (275 سطر)
        └── UserPreferencesContext.jsx (58 سطر)

migration-user-preferences.sql (94 سطر)
```

---

## الخطوات التالية (اختيارية)

1. إضافة ترتيب سحب وإفلات للمنيو
2. إضافة نسخ احتياطية للتفضيلات
3. إضافة قوالب تفضيلات مسبقة (themes)
4. تصدير/استيراد الإعدادات
5. مزامنة التفضيلات عبر الأجهزة

---

🎉 **نظام التخصيص الشخصي جاهز للاستخدام!**
