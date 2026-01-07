import { motion } from "framer-motion";
import { FileText, CheckCircle, AlertCircle, Shield, CreditCard, Stethoscope, Ban, Info } from "lucide-react";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";

export default function TermsOfService() {
  const sections = [
    {
      title: "قبول الشروط",
      icon: <CheckCircle className="w-6 h-6 text-primary" />,
      content: "بمجرد الوصول إلى منصة طبيبي أو استخدامها، فإنك توافق على الالتزام بشروط الخدمة هذه وجميع القوانين واللوائح المعمول بها. إذا كنت لا توافق على أي من هذه الشروط، فيُحظر عليك استخدام هذا الموقع أو الوصول إليه."
    },
    {
      title: "وصف الخدمة",
      icon: <Stethoscope className="w-6 h-6 text-primary" />,
      content: "توفر منصة طبيبي نظاماً متكاملاً لإدارة العيادات الطبية، يشمل ذلك إدارة المواعيد، وسجلات المرضى، والخطط العلاجية، والفواتير، وميزات الذكاء الاصطناعي المساعدة. نحن نقدم هذه الخدمات كأدوات لمساعدة الممارسين الطبيين ولا نقدم أي نصائح طبية مباشرة للمرضى."
    },
    {
      title: "الحساب والأمان",
      icon: <Shield className="w-6 h-6 text-primary" />,
      content: "أنت مسؤول عن الحفاظ على سرية معلومات حسابك وكلمة المرور، وعن تقييد الوصول إلى جهاز الكمبيوتر الخاص بك. توافق على قبول المسؤولية عن جميع الأنشطة التي تحدث تحت حسابك أو كلمة المرور الخاصة بك."
    },
    {
      title: "الاشتراكات والمدفوعات",
      icon: <CreditCard className="w-6 h-6 text-primary" />,
      content: "بعض خدمات طبيبي تتطلب اشتراكاً مدفوعاً. يتم تجديد الاشتراكات تلقائياً ما لم يتم إلغاؤها قبل نهاية فترة الاشتراك الحالية. نحتفظ بالحق في تعديل رسوم الاشتراك في أي وقت، مع إشعار مسبق قبل سريان أي تغيير."
    },
    {
      title: "إخلاء المسؤولية الطبية",
      icon: <AlertCircle className="w-6 h-6 text-red-500" />,
      content: "المحتوى والأدوات المقدمة عبر منصة طبيبي، بما في ذلك اقتراحات الذكاء الاصطناعي، هي لأغراض إعلامية ومساعدة فقط ولا تغني عن الحكم الطبي المهني. الطبيب المستخدم للمنصة هو المسؤول الوحيد عن القرارات الطبية والعلاجية لمرضاه."
    },
    {
      title: "استخدام مقبول",
      icon: <Ban className="w-6 h-6 text-primary" />,
      content: "توافق على عدم استخدام الخدمة لأي غرض غير قانوني أو محظور بموجب هذه الشروط. لا يجوز لك استخدام الخدمة بأي طريقة قد تضر أو تعطل أو تثقل كاهل خوادم طبيبي أو الشبكات المتصلة بها."
    },
    {
      title: "حدود المسؤولية",
      icon: <Info className="w-6 h-6 text-primary" />,
      content: "في حدود ما يسمح به القانون، لا تتحمل طبيبي أو مورديها أي مسؤولية عن أي أضرار (بما في ذلك، دون حصر، الأضرار الناجمة عن فقدان البيانات أو الأرباح، أو بسبب انقطاع الأعمال) تنشأ عن استخدام أو عدم القدرة على استخدام المواد أو الخدمات على منصة طبيبي."
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      <Header />
      
      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-4xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">شروط الخدمة</h1>
            <p className="text-gray-600 text-lg">
              يرجى قراءة هذه الشروط بعناية قبل استخدام منصة طبيبي.
            </p>
          </motion.div>

          <div className="space-y-6">
            {sections.map((section, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg shrink-0">
                    {section.icon}
                  </div>
                  <div className="space-y-2 flex-1">
                    <h2 className="text-xl font-bold text-gray-900">{section.title}</h2>
                    <p className="text-gray-600 leading-relaxed text-sm md:text-base">
                      {section.content}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 text-center text-sm text-gray-500 border-t border-border pt-8"
          >
            <p>آخر تحديث: {new Date().toLocaleDateString('ar-EG')}</p>
            <p className="mt-2">
              للاستفسارات القانونية، يرجى التواصل معنا عبر: <a href="mailto:legal@tabibi.site" className="text-primary hover:underline">legal@tabibi.site</a>
            </p>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
