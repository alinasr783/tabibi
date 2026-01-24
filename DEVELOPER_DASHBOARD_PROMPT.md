# برومبت تطوير داشبورد المطورين لنظام Tabibi Apps V2

هذا المستند يحدد بشكل واضح ودقيق المتطلبات، الصفحات، تدفقات البيانات، وسياسات الأمان اللازمة لبناء "لوحة المطورين" (Developer Dashboard) وفقاً للميزات الحالية في النظام.

## الأهداف
- تمكين المطور من:
  - إنشاء تطبيق جديد في المتجر (Marketplace) بدون لمس ملفات Tabibi.
  - إرسال إصدار جديد للتطبيق ككود (JS/CSS) مباشرة إلى قاعدة البيانات.
  - متابعة حالة الإصدارات والمراجعات والملاحظات.
  - طلب إنشاء جداول بيانات خاصة بالتطبيق (SQL Schema Requests).
  - إدارة معلومات حسابه كمطور.
- احترام سياسات الأمان (RLS) بحيث لا يرى المطور إلا بياناته وتطبيقاته فقط.

## النطاق
- يعتمد على الجداول الحالية:
  - tabibi_developers
  - tabibi_marketplace_apps
  - tabibi_app_versions
  - tabibi_app_schema_requests
- يعتمد على خدمة Supabase عبر عميل الواجهة.
- يعتمد على سياسات RLS المُضافة في: [setup_developer_policies.sql](file:///c:/Users/hp/Desktop/Dev/tabibi-master/setup_developer_policies.sql)

## أدوار المستخدمين
- مطور (Authenticated): يملك سجل في tabibi_developers مرتبط بـ auth.uid
- فريق المراجعة (Admin): يعتمد الإصدارات ويعطي ملاحظات (خارج هذا النطاق الآن)

## الصفحات المطلوبة
- صفحة "نظرة عامة" (Overview)
  - تعرض موجز التطبيقات الخاصة بالمطور، عدد الإصدارات، حالات المراجعة، وآخر نشاط.
  - أزرار سريعة: "إنشاء تطبيق"، "إرسال إصدار جديد"، "طلب مخطط بيانات".
  - البيانات من listMyApps().
- صفحة "تطبيقاتي" (My Apps)
  - جدول بتطبيقات المطور: العنوان، slug، التصنيف، الحالة التجارية (مدفوع/مجاني)، آخر تحديث.
  - زر "تفاصيل" ينقل لصفحة تفاصيل التطبيق.
  - زر "إرسال إصدار جديد".
  - إنشاء تطبيق جديد عبر نموذج.
- صفحة "إنشاء تطبيق" (Create App)
  - نموذج حقول: title, slug, short_description, full_description, category, is_paid, price_monthly, has_free_trial, trial_days, features[], screenshots[], icon_url, cover_image_url, preview_link
  - تحقق فوري من تطابق slug مع مفتاح التسجيل الذي سيستخدم لاحقاً في الواجهة.
  - إرسال عبر createMarketplaceApp(payload).
- صفحة "تفاصيل التطبيق" (App Details)
  - عرض بيانات المتجر للتطبيق.
  - قائمة بالإصدارات الخاصة به: رقم الإصدار، الحالة (draft/submitted/in_review/approved/rejected)، تاريخ الإنشاء، ملاحظات المراجع.
  - زر "إرسال إصدار جديد".
  - زر "طلب مخطط بيانات".
- صفحة "إرسال إصدار جديد" (Submit Version)
  - حقول: version_number (مثال 1.0.0)، js_entry_point (نص الكود أو اسم المدخل)، css_bundle (نص CSS اختياري)، changelog.
  - محرر أكواد بسيط (Monaco أو textarea) مع قيود حجم معقولة.
  - إرسال عبر submitAppVersion(appId, versionNumber, jsEntryPoint, cssBundle) — الحالة تكون submitted.
  - يظهر تحذير أمني: الكود يخضع للمراجعة اليدوية ولا يملك وصول مباشر لبيانات Tabibi.
- صفحة "طلبات مخطط البيانات" (Schema Requests)
  - نموذج: table_name، sql_structure (CREATE TABLE ...)، purpose.
  - قائمة بالطلبات السابقة وحالاتها: pending/approved/applied/rejected + رد المسؤول.
- صفحة "ملف المطور" (Developer Profile)
  - عرض معلومات المطور: name, email, website, verification_status.
  - زر تحديث بيانات عامة (name/website) بما يسمح به RLS.

## تدفق البيانات والخدمات
- خدمات مطورين: [apiDeveloperApps.js](file:///c:/Users/hp/Desktop/Dev/tabibi-master/src/services/apiDeveloperApps.js)
  - getMyDeveloperProfile()
  - listMyApps()
  - createMarketplaceApp(payload)
  - submitAppVersion(appId, versionNumber, jsEntryPoint, cssBundle)
- احترام RLS:
  - سياسات مفعلة على الجداول المذكورة تمنع المطور من التعديل خارج ملكيته.
  - أي عملية تعتمد auth.uid داخل Supabase.

## التحقق والقيود
- التحقق على الواجهة باستخدام react-hook-form + zod:
  - slug: أحرف صغيرة/شرطة سفلية/بدون مسافات، فريد للمطور.
  - title: مطلوب، بين 3–60 حرفاً.
  - price_monthly: رقم >= 0 عند is_paid = true.
  - version_number: نمط SemVer بسيط (x.y.z).
  - js_entry_point/css_bundle: حدود حجم نص معقولة (مثلاً <= 200KB لكل حقل).
- التحقق الخلفي يعتمد فشل الإدخالات إذا خالفت RLS أو قيود الجدول.

## الأمان
- لا وصول لملفات Tabibi — كل شيء يتم عبر الجداول وRLS.
- الإصدارات بحالة submitted — لا تُعرض للمستخدمين حتى تعتمد يدوياً.
- عرض تحذيرات واضحة قبل الإرسال: "الكود سيتم تشغيله في Sandbox ولا يصل لبياناتك إلا عبر صلاحيات موافِق عليها".

## واجهات المستخدم المقترحة
- استخدام مكونات جاهزة في المشروع (button, card, input, select, dialog).
- أيقونات من lucide-react، تخطيط RTL افتراضياً.
- تجربة Mobile-first: النماذج والأزرار كبيرة وقابلة للمس.

## معايير القبول
- المطور يستطيع:
  - إنشاء تطبيق جديد بنجاح ويظهر في "تطبيقاتي".
  - إرسال إصدار جديد بحالة submitted مرتبط بالتطبيق.
  - رؤية قائمة الإصدارات وحالاتها.
  - إرسال طلب مخطط بيانات ومتابعة حالته.
  - تعديل معلوماته الأساسية إن كانت سياسة RLS تسمح.
- لا يمكنه رؤية تطبيقات أو إصدارات مطورين آخرين.
- أي محاولة للوصول خارج ملكيته تفشل بسبب RLS.

## ربط بالواجهة الحالية (للتكامل لاحقاً)
- المتجر العام يعرض التطبيقات من tabibi_marketplace_apps (kill_switch_active=false).
- عند الموافقة على إصدار (approved)، يظهر للمستخدمين ويُستخدم عند التثبيت.
- ملفات عرض التطبيقات الحالية:
  - [TabibiAppsPage.jsx](file:///c:/Users/hp/Desktop/Dev/tabibi-master/src/features/tabibi-tools/TabibiAppsPage.jsx)
  - [TabibiAppDetailsPage.jsx](file:///c:/Users/hp/Desktop/Dev/tabibi-master/src/features/tabibi-tools/TabibiAppDetailsPage.jsx)

## خطوات تنفيذ تقنية مختصرة
- إنشاء مسار جديد: `src/features/developer-dashboard/`
  - Overview.jsx
  - MyApps.jsx
  - CreateApp.jsx
  - AppDetails.jsx
  - SubmitVersion.jsx
  - SchemaRequests.jsx
  - DeveloperProfile.jsx
- ربط المسارات عبر react-router مع حماية Auth.
- استخدام TanStack Query لقراءة/كتابة البيانات عبر apiDeveloperApps.js.
- تطبيق zod + react-hook-form للتحقق.

## ملاحظات إضافية
- لاحقاً يمكن إضافة:
  - محرر أكواد مطور أكثر (Monaco Editor).
  - Manifest للصلاحيات (tabibi_app_version_scopes) ضمن صفحة الإصدار.
  - سجل مراجعة ورسائل بين المطور وفريق المراجعة.
  - عدّاد استخدام وقياسات للأداء لكل إصدار.

