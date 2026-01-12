# خطة تطوير لوحة تحكم ملاك التطبيقات (Tabibi App Owners Dashboard)

## 1. نظرة عامة (Overview)
الهدف هو إنشاء لوحة تحكم مركزية ومتطورة تتيح لمطوري وملاك التطبيقات على منصة "طبيبي" (Tabibi Apps Ecosystem) إدارة تطبيقاتهم، متابعة الأداء، والاطلاع على البيانات التي يتم جمعها أو طلبها من خلال تطبيقاتهم داخل العيادات.

## 2. الهوية البصرية والتصميم (Design System & UI/UX)
سيعتمد التصميم بشكل كامل على الهوية البصرية الخاصة بصفحة هبوط طبيبي (Tabibi Landing Page) لضمان التناسق والاحترافية.

### الألوان (Color Palette)
*   **اللون الأساسي (Primary):** الذهبي `#C8A155` (يمثل الفخامة والتميز).
*   **اللون الثانوي (Secondary):** التيل الغامق `#1AA19C` (يمثل الثقة والقطاع الطبي).
*   **الخلفيات (Backgrounds):**
    *   خلفية الصفحة الرئيسية: تدرج لوني خفيف جداً أو أبيض نقي `#FFFFFF` مع زخارف هندسية خفيفة (Subtle Patterns).
    *   خلفية البطاقات (Cards): أبيض مع تأثير زجاجي خفيف (Glassmorphism) عند الحاجة.
*   **النصوص (Typography):**
    *   العناوين: أسود غامق `#111827` أو كحلي غامق.
    *   النصوص الفرعية: رمادي متوسط `#6B7280`.

### الخطوط (Typography)
*   **العربية:** `Tajawal` (للواجهات العامة) و `Amiri` (للعناوين الفخمة).
*   **الإنجليزية:** `Inter` أو `Playfair Display` للأرقام والعناوين الإنجليزية.

### مكونات الواجهة (UI Components)
*   استخدام مكتبة `shadcn/ui` مع تخصيص الألوان لتطابق الهوية.
*   **البطاقات (Cards):** حواف دائرية (`rounded-xl`)، ظلال ناعمة (`shadow-sm`)، وتأثير `hover` يرفع البطاقة قليلاً.
*   **الجداول (Tables):** تصميم نظيف، صفوف متباعدة، مع إمكانية الفرز والبحث.
*   **الرسوم البيانية (Charts):** استخدام `Recharts` بألوان الهوية (الذهبي والتيل).

---

## 3. الهيكلية التقنية ونظام النطاقات (Technical Architecture & Subdomains)

### استراتيجية النطاق الفرعي (Subdomain Strategy)
سيتم استضافة لوحة التحكم على النطاق الفرعي: **`app_builder.tabibi.site`**.

**أفضل طريقة للتنفيذ (The Best Approach):**
لتحقيق أفضل أداء وفصل كامل بين "تطبيق الأطباء" و"لوحة المطورين"، سنعتمد نهج **Monorepo** أو **Separate Builds**:

1.  **مشروع منفصل (Recommended):** إنشاء مجلد جديد `apps/developer-dashboard` داخل المشروع (أو مستودع منفصل) يحتوي على مشروع React/Vite مستقل.
    *   **الميزة:** هذا يضمن أن كود الأطباء لا يختلط بكود المطورين، ويجعل التحميل أسرع (Bundle Size أصغر).
    *   **النشر (Deployment):** يتم ربط هذا المشروع بـ Vercel/Netlify وتوجيه النطاق `app_builder.tabibi.site` إليه مباشرة.
    *   **مشاركة المكونات:** يمكن مشاركة مجلد `src/components/ui` بين المشروعين لتوحيد التصميم.

2.  **نفس المشروع (Alternative):** استخدام التوجيه (Routing) بناءً على النطاق (Subdomain Routing).
    *   يتم التحقق من `window.location.hostname` في ملف `App.jsx`.
    *   إذا كان النطاق `app_builder`، يتم عرض مكونات الداشبورد.
    *   *العيوب:* حجم ملفات أكبر، تعقيد في الراوتر.

**القرار:** سنعتمد الخيار الأول (مشروع منفصل في نفس المستودع) لسهولة الإدارة والنشر.

---

## 4. هيكلية قاعدة البيانات (Database Structure)

بناءً على تحليل ملف `database.txt`، نحتاج لإضافة جداول جديدة وتعديل جداول حالية لربط التطبيقات بمطورين خارجيين.

### أ. الجداول الجديدة (New Tables)

#### 1. جدول المطورين (`app_developers`)
هذا الجدول يربط مستخدمي Supabase Auth بصفة "مطور تطبيقات".
```sql
CREATE TABLE public.app_developers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, -- Link to auth.users
  name text NOT NULL,
  company_name text,
  email text NOT NULL,
  phone text,
  website text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended')),
  api_key text UNIQUE, -- For future API access
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT app_developers_pkey PRIMARY KEY (id),
  CONSTRAINT app_developers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT app_developers_user_id_unique UNIQUE (user_id)
);
```

#### 2. جدول بيانات التطبيقات (`app_data_submissions`)
هذا هو الجدول المسؤول عن "مستكشف البيانات". أي بيانات يجمعها التطبيق من العيادة يتم تخزينها هنا بشكل JSON.
```sql
CREATE TABLE public.app_data_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  app_id bigint NOT NULL,
  clinic_id uuid NOT NULL,
  submission_type text NOT NULL, -- e.g., 'new_order', 'booking_request'
  data jsonb NOT NULL DEFAULT '{}'::jsonb, -- The actual data payload
  status text DEFAULT 'new',
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT app_data_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT app_data_submissions_app_id_fkey FOREIGN KEY (app_id) REFERENCES public.tabibi_apps(id),
  CONSTRAINT app_data_submissions_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(clinic_uuid) -- Assuming linkage via UUID
);
```

### ب. التعديلات على الجداول الحالية (Updates to Existing Tables)

#### 1. جدول التطبيقات (`tabibi_apps`)
نحتاج لربط التطبيق بالمطور المالك له.
```sql
ALTER TABLE public.tabibi_apps 
ADD COLUMN developer_id uuid,
ADD COLUMN submission_schema jsonb DEFAULT '{}'::jsonb, -- To validate incoming data
ADD CONSTRAINT tabibi_apps_developer_id_fkey FOREIGN KEY (developer_id) REFERENCES public.app_developers(id);
```

---

## 5. الوظائف والمميزات التفصيلية (Detailed Features)

### أ. تسجيل الدخول والوصول (Authentication)
*   بوابة دخول خاصة للمطورين/الشركاء على `app_builder.tabibi.site`.
*   عند التسجيل، يتم إنشاء سجل في `auth.users` وأيضاً في `app_developers`.

### ب. الصفحة الرئيسية (Dashboard Home)
لوحة قيادة تعرض ملخصاً سريعاً:
1.  **بطاقات الإحصائيات (Stat Cards):**
    *   إجمالي عدد التثبيتات (Active Installs) - يتم جلبها من جدول `app_subscriptions`.
    *   إجمالي الإيرادات (Total Revenue).
    *   عدد العيادات النشطة اليوم.
2.  **رسم بياني للأداء (Performance Chart):** يوضح نمو التثبيتات أو الاستخدام.

### ج. إدارة التطبيقات (App Management)
1.  **تعديل البيانات الأساسية:** تحديث `tabibi_apps` (الاسم، الوصف، السعر).
2.  **إدارة الإصدارات:** رفع ملفات أو روابط التحديث.
3.  **حالة التطبيق:** التحكم في `is_active`.

### د. مستكشف البيانات (Data Explorer) - *ميزة جوهرية*
واجهة لعرض البيانات المخزنة في `app_data_submissions`.
*   **عرض السجلات:** جدول يعرض محتوى عمود `data` (JSONB) بطريقة منظمة.
*   **التصدير:** زر لتحويل JSON إلى Excel/CSV للمطور.

---

## 6. خارطة الطريق للتنفيذ (Implementation Roadmap)

1.  **المرحلة الأولى: قاعدة البيانات (Database)**
    *   تنفيذ كود SQL لإنشاء `app_developers` و `app_data_submissions`.
    *   تحديث `tabibi_apps`.

2.  **المرحلة الثانية: إعداد المشروع (Setup)**
    *   إنشاء مشروع Vite جديد في مجلد `developer-dashboard`.
    *   نسخ إعدادات Tailwind وتكوين الألوان.

3.  **المرحلة الثالثة: تطوير الواجهة (Frontend)**
    *   صفحة الدخول (Login).
    *   لوحة التحكم (Dashboard Home).
    *   صفحة تفاصيل التطبيق والبيانات.

4.  **المرحلة الرابعة: النشر (Deployment)**
    *   رفع المشروع على Vercel/Netlify.
    *   ربط النطاق `app_builder.tabibi.site`.

---

## 7. دليل الاتصال مع Supabase (Supabase Integration Guide)

للتواصل مع قاعدة البيانات والخدمات الخلفية، نستخدم مكتبة `@supabase/supabase-js`. فيما يلي كيفية إعدادها واستخدامها داخل مشروع الـ App Builder.

### أ. تثبيت وإعداد العميل (Setup & Configuration)

أولاً، تأكد من تثبيت المكتبة:
```bash
npm install @supabase/supabase-js
```

ثم قم بإنشاء ملف `src/services/supabase.js`:
```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### ب. المصادقة (Authentication)

**تسجيل الدخول (Login):**
```javascript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'developer@example.com',
  password: 'password123',
});
```

**تسجيل الخروج (Logout):**
```javascript
await supabase.auth.signOut();
```

**الحصول على المستخدم الحالي (Get Current User):**
```javascript
const { data: { user } } = await supabase.auth.getUser();
```

### ج. التعامل مع البيانات (Data Operations)

**جلب بيانات المطور (Fetch Developer Profile):**
```javascript
const { data, error } = await supabase
  .from('app_developers')
  .select('*')
  .eq('user_id', user.id)
  .single();
```

**جلب تطبيقات المطور (Fetch My Apps):**
```javascript
const { data, error } = await supabase
  .from('tabibi_apps')
  .select('*')
  .eq('developer_id', developerId);
```

**إرسال بيانات جديدة (Insert Data):**
```javascript
const { data, error } = await supabase
  .from('tabibi_apps')
  .insert([
    { title: 'New App', description: '...', developer_id: developerId }
  ])
  .select();
```

### د. نصائح هامة (Best Practices)
1.  **حماية البيانات (RLS):** تأكد دائماً من تفعيل Row Level Security على الجداول لضمان أن المطور يرى بياناته فقط.
2.  **إدارة الحالة (State Management):** استخدم `useEffect` لجلب البيانات عند تحميل الصفحة، وقم بتخزينها في `useState`.
3.  **معالجة الأخطاء (Error Handling):** دائماً تحقق من وجود `error` بعد كل عملية طلب من Supabase واعرض رسالة مناسبة للمستخدم.
