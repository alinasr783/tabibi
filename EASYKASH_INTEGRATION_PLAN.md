# خطة دمج بوابة الدفع EasyKash مع منصة طبيبي (Technical Plan)

بناءً على التوثيق التقني لـ EasyKash (Direct Pay API v1)، هذه هي الخطة التنفيذية المحدثة.

## مسار العمل (Workflow)
سنستخدم الـ **Direct Pay API** الذي يوفر صفحة دفع جاهزة (Hosted Checkout) تدعم البطاقات والمحافظ وفوري.

### 1. إنشاء طلب الدفع (Initiate Payment)
- **الجهة:** Backend (Supabase Edge Function).
- **المدخلات:** `amount`, `customerReference` (رقم العملية لدينا), `buyer info`.
- **الإجراء:**
  1. استدعاء `POST https://back.easykash.net/api/directpayv1/pay`.
  2. تمرير `paymentOptions` (مثل: `[2, 4, 5]` للكروت والمحافظ وفوري).
  3. استلام `redirectUrl` من EasyKash.
- **النتيجة:** إرجاع رابط الدفع للـ Frontend لتوجيه المستخدم.

### 2. معالجة الدفع (User Payment)
- يقوم المستخدم بالدفع في صفحة EasyKash.
- عند النجاح، يتم توجيهه تلقائياً إلى `redirectUrl` الذي أرسلناه (صفحة `PaymentCallback` في موقعنا).

### 3. التحقق من الدفع (Verification & Callback)
هناك طريقتان للتحقق، سنستخدم كلاهما لضمان الأمان:

**أ. الـ Webhook (Server-to-Server):**
- تستقبل Supabase Function (`easykash-webhook`) طلب `POST` من EasyKash.
- **التحقق الأمني:** نقوم بحساب الـ HMAC Signature باستخدام الـ `HMAC Secret Key` ومقارنته بـ `signatureHash` القادم في الطلب.
  - المعادلة: `SHA512(ProductCode + Amount + ProductType + PaymentMethod + status + easykashRef + customerReference)`
- إذا تطابق التوقيع والحالة `PAID`:
  - تحديث حالة العملية في قاعدة البيانات إلى `completed`.
  - تفعيل الاشتراك/إضافة الرصيد.

**ب. الـ Callback Page (Frontend):**
- تستقبل المستخدم بعد العودة من EasyKash.
- تقوم باستدعاء دالة Backend للتحقق من حالة العملية في قاعدة بياناتنا (التي تم تحديثها عبر الـ Webhook) أو عمل `Inquiry` مباشر إذا لزم الأمر.

## خطوات التنفيذ (Implementation Steps)

### المرحلة 1: قاعدة البيانات (Database)
1. إنشاء جدول `transactions` لتسجيل عمليات الدفع:
   - `id`: UUID (Primary Key)
   - `easykash_ref`: String (من EasyKash)
   - `amount`: Number
   - `status`: Enum (pending, completed, failed)
   - `type`: Enum (subscription, wallet, app_purchase)
   - `metadata`: JSON (تفاصيل الخطة أو التطبيق)
   - `created_at`, `updated_at`

### المرحلة 2: Backend (Supabase Edge Functions)
1. **`create-payment-link` Function:**
   - تستقبل طلب من الـ Frontend.
   - تنشئ سجل `pending` في `transactions`.
   - تكلم EasyKash API.
   - ترجع رابط الدفع.

2. **`easykash-webhook` Function:**
   - نقطة النهاية لاستقبال إشعارات EasyKash.
   - تنفذ منطق التحقق (HMAC Verification).
   - تحدث حالة العملية وتفعل الخدمة.

### المرحلة 3: Frontend (React)
1. **تحديث `PaymentService.js`:**
   - إضافة دوال لاستدعاء الـ Edge Functions.
2. **تحديث `PlanConfirmation.jsx`:**
   - ربط زر الدفع بـ `create-payment-link`.
3. **تحديث `PaymentCallback.jsx`:**
   - عرض حالة الانتظار حتى يؤكد الـ Backend نجاح العملية.

## الملاحظات التقنية
- **العملة:** EGP.
- **Expiry:** سنضبط صلاحية رابط الدفع (Cash Expiry) بـ 3 ساعات افتراضياً.
- **Testing:** سنحتاج لبيئة تجربة (Localhost) وسنستخدم `ngrok` أو مشابه لاختبار الـ Webhook محلياً.
