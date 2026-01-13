# متطلبات الربط مع بوابة الدفع EasyKash (محدث)

بعد مراجعة التوثيق التقني (Documentation) الخاص بـ EasyKash، هذه هي البيانات المحددة التي نحتاجها لإتمام الربط بنجاح.

## 1. بيانات المصادقة (Authentication Credentials)
يرجى استخراج البيانات التالية من لوحة تحكم التاجر (Merchant Dashboard) -> صفحة **Integration Settings** أو **Cash API**:

- **API Key**: (Authorization Token) يستخدم في جميع طلبات الـ API.
- **HMAC Secret Key**: مفتاح سري يستخدم للتحقق من صحة الردود (Callbacks) لضمان الأمان ومنع التلاعب.

## 2. إعدادات لوحة التحكم (Dashboard Configuration)
يجب عليك الدخول إلى إعدادات EasyKash وضبط الرابط التالي في خانة **Callback URL**:

- **Callback URL**:
  ```
  https://your-domain.com/api/payment/easykash-webhook
  ```
  *(ملاحظة: أثناء التطوير، سنحتاج لاستخدام رابط محلي، سأخبرك كيف نضبطه لاحقاً).*

## 3. خيارات الدفع (Payment Options)
الـ API يتطلب تحديد وسائل الدفع المتاحة بالأرقام. يرجى تأكيد الوسائل التي تعاقدت عليها أو تريد تفعيلها:
- **1**: Cash Through AMAN (أمان)
- **2**: Credit & Debit Card (بطاقات بنكية) - *أساسي*
- **4**: Mobile Wallet (محافظ إلكترونية) - *أساسي*
- **5**: Cash Through Fawry (فوري) - *أساسي*
- **6**: Meeza (ميزة)
- **17**: ValU (فاليو)
- **31**: Apple Pay

*سنقوم مبدئياً بتفعيل الكروت (2)، المحافظ (4)، وفوري (5) ما لم تطلب غير ذلك.*

---

### ملخص لما يجب أن ترسله لي الآن:
1. **API Key**
2. **HMAC Secret Key** (مهم جداً للأمان)

بمجرد إرسال هذه البيانات، سنبدأ في كتابة كود الـ Backend (Supabase Functions) والـ Frontend.
