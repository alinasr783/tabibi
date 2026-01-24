# كيفية إضافة تطبيق جديد بالكامل في نظام Tabibi Apps (الإصدار V2)

هذا الدليل يشرح لك خطوة بخطوة كيفية إنشاء تطبيق جديد من الصفر، تسجيله في قاعدة البيانات، ربطه بالواجهة، وإصداره للمستخدمين داخل متجر Tabibi.

يعتمد النظام الجديد على جداول السوق: `tabibi_marketplace_apps`, `tabibi_app_versions`, `tabibi_app_installations`, بالإضافة إلى الصلاحيات: `tabibi_app_scopes`, `tabibi_app_version_scopes`.

---

## المتطلبات
- حساب مطور مسجل في جدول المطورين (developer_id).
- معرف واضح للتطبيق (slug) تستخدمه كـ مفتاح ثابت.
- التزام تصميم Mobile-first وتجربة مستخدم عربية واضحة.

---

## الخطوة 1: إنشاء واجهة التطبيق (React Component)
- أنشئ مجلداً لتطبيقك داخل المسار التالي:
  - `src/features/tabibi-tools/apps/<your-app-slug>/`
- أنشئ ملف المكون الرئيسي، مثال: `InventoryManager.jsx`

مثال:

```jsx
// src/features/tabibi-tools/apps/inventory_manager/InventoryManager.jsx
import React from "react";

export default function InventoryManager() {
  return (
    <div className="p-4 md:p-6 space-y-3" dir="rtl">
      <h1 className="text-xl md:text-2xl font-bold">إدارة المخزون</h1>
      <p className="text-sm text-muted-foreground">
        تطبيق بسيط لإدارة المستلزمات الطبية داخل العيادة.
      </p>
      {/* ضع منطق التطبيق ومكوناته هنا */}
    </div>
  );
}
```

---

## الخطوة 2: ربط التطبيق بسجل المكونات في الواجهة
- افتح ملف السجل: [appsRegistry.jsx](file:///c:/Users/hp/Desktop/Dev/tabibi-master/src/features/tabibi-tools/appsRegistry.jsx)
- قم باستيراد المكون وإضافة المفتاح الخاص به في `APPS_COMPONENT_REGISTRY`

مثال:

```javascript
// src/features/tabibi-tools/appsRegistry.jsx
import InventoryManager from "./apps/inventory_manager/InventoryManager";

export const APPS_COMPONENT_REGISTRY = {
  // ...
  'inventory_manager': InventoryManager,
};
```

مهم: المفتاح `'inventory_manager'` يجب أن يطابق تماماً قيمة `slug` في قاعدة البيانات.

---

## الخطوة 3: إدخال بيانات التطبيق في قاعدة البيانات (Marketplace)
أضف سجل التطبيق في جدول `tabibi_marketplace_apps`. يمكنك التنفيذ عبر SQL في Supabase:

```sql
-- افترض أن لديك developer_id صالحاً
INSERT INTO public.tabibi_marketplace_apps (
  developer_id,
  title,
  slug,
  short_description,
  full_description,
  icon_url,
  cover_image_url,
  category,
  tags,
  is_paid,
  price_monthly,
  has_free_trial,
  trial_days,
  features,
  screenshots,
  preview_link
) VALUES (
  '00000000-0000-0000-0000-000000000000',      -- ضع developer_id الحقيقي
  'إدارة المخزون',
  'inventory_manager',
  'تتبع المستلزمات الطبية والأدوية',
  'نظام مبسط لإدارة المخزون داخل العيادة مع تنبيهات عند انخفاض الكميات.',
  'https://example.com/icon.png',
  'https://example.com/cover.png',
  'Management',
  ARRAY['Management'],
  true,
  100,
  true,
  14,
  '[\"قائمة الأصناف\", \"تنبيهات النواقص\", \"سجل الموردين\"]'::jsonb,
  '[\"https://example.com/s1.png\", \"https://example.com/s2.png\"]'::jsonb,
  'https://tabibi.site/apps/inventory-manager'
);
```

ملاحظات:
- `is_paid` و`price_monthly` لتحديد نموذج التسعير الشهري.
- يمكنك ترك `features` و`screenshots` فارغين، الواجهة فيها fallback تلقائي.

---

## الخطوة 4: إنشاء إصدار للتطبيق (App Version)
لجعل التطبيق يظهر في المتجر، يجب وجود إصدار Approved مرتبط به:

```sql
-- احصل على app_id لسجل التطبيق الذي أدخلته
-- ثم أنشئ إصداراً أولياً 1.0.0
INSERT INTO public.tabibi_app_versions (
  app_id,
  version_number,
  status,
  js_entry_point,
  changelog,
  published_at
) VALUES (
  <APP_ID>,            -- ضع معرف التطبيق
  '1.0.0',
  'approved',
  'inventory_manager', -- يطابق المفتاح/slug
  'الإصدار الأول',
  now()
);
```

- حقل `js_entry_point` يستخدم حالياً كمرجع للمفتاح في التسجيل (registry).
- عند اكتمال محرك الـ Sandbox مستقبلاً، سيحتوي هذا الحقل على كود JS الفعلي أو مسار الحزمة.

---

## الخطوة 5: طلب صلاحيات (Permissions) إن لزم
لو كان تطبيقك يحتاج صلاحيات للوصول للبيانات (قراءة/كتابة المرضى/المواعيد)، اربط إصدارك بالصلاحيات المطلوبة:

1) تأكد من وجود الصلاحية في `tabibi_app_scopes` (مثلاً `patients.read`)، وإن لم توجد، أضفها:
```sql
INSERT INTO public.tabibi_app_scopes (scope_code, description, category, risk_level)
VALUES ('patients.read', 'قراءة بيانات المرضى الأساسية', 'Patients', 'medium')
ON CONFLICT (scope_code) DO NOTHING;
```

2) اربط الإصدار بالصلاحية:
```sql
INSERT INTO public.tabibi_app_version_scopes (version_id, scope_id, justification)
SELECT v.id, s.id, 'يحتاج التطبيق لعرض قائمة المرضى'
FROM public.tabibi_app_versions v, public.tabibi_app_scopes s
WHERE v.app_id = <APP_ID> AND v.version_number = '1.0.0' AND s.scope_code = 'patients.read';
```

الواجهة ستظهر لاحقاً نافذة موافقة واضحة للمستخدم عند التثبيت بناءً على هذه الصلاحيات.

---

## الخطوة 6: (اختياري) طلب جداول بيانات خاصة بالتطبيق
إذا احتجت جدولاً مخصصاً لتطبيقك، قدم طلباً عبر `tabibi_app_schema_requests` لمراجعة الـ SQL:

```sql
INSERT INTO public.tabibi_app_schema_requests (
  app_id,
  developer_id,
  table_name,
  sql_structure,
  purpose
) VALUES (
  <APP_ID>,
  '00000000-0000-0000-0000-000000000000', -- developer_id
  'app_inventory_items',
  'CREATE TABLE public.app_inventory_items (id bigint generated always as identity primary key, clinic_id uuid not null, name text not null, quantity integer default 0, created_at timestamptz default now());',
  'تخزين أصناف ومخزون العيادة'
);
```

بعد موافقة الإدارة، سيتم تنفيذ الـ SQL بشكل آمن.

---

## الخطوة 7: التثبيت والإدارة من الواجهة
- المتجر يعرض التطبيقات من خدمة: [apiTabibiApps.js](file:///c:/Users/hp/Desktop/Dev/tabibi-master/src/services/apiTabibiApps.js)
  - `getApps`: يقرأ من `tabibi_marketplace_apps`
  - `getAppById`: تفاصيل التطبيق
  - `getInstalledApps`: الاشتراكات عبر `tabibi_app_installations`
- صفحات العرض:
  - المتجر: [TabibiAppsPage.jsx](file:///c:/Users/hp/Desktop/Dev/tabibi-master/src/features/tabibi-tools/TabibiAppsPage.jsx)
  - التفاصيل: [TabibiAppDetailsPage.jsx](file:///c:/Users/hp/Desktop/Dev/tabibi-master/src/features/tabibi-tools/TabibiAppDetailsPage.jsx)

عند الضغط على "تفعيل"، يتم إنشاء سجل في `tabibi_app_installations` ويُربط بأحدث إصدار Approved.

---

## نصائح مهمة
- استخدم نفس قيمة `slug` في قاعدة البيانات وكمفتاح داخل `APPS_COMPONENT_REGISTRY`.
- ابدأ بتطبيق بسيط بدون صلاحيات ثم زد الصلاحيات عند الحاجة.
- استخدم `features` و`screenshots` لتحسين صفحة التفاصيل.
- راقب الأداء والتجاوب جيداً على الموبايل.

---

## ملخص سريع
1) أنشئ مكون React داخل `src/features/tabibi-tools/apps/<slug>/Component.jsx`.
2) سجّله في [appsRegistry.jsx](file:///c:/Users/hp/Desktop/Dev/tabibi-master/src/features/tabibi-tools/appsRegistry.jsx) تحت نفس المفتاح `<slug>`.
3) أضف سجل التطبيق في `tabibi_marketplace_apps` مع `slug` مطابق.
4) أنشئ إصداراً Approved في `tabibi_app_versions` مع `js_entry_point = slug`.
5) (اختياري) اربط الصلاحيات في `tabibi_app_version_scopes`.
6) جرّب الواجهة: يظهر في المتجر، ويمكن تثبيته وإدارته من صفحات التطبيقات.

