import { motion } from "framer-motion";
import { Shield, Lock, Eye, Calendar, Server, FileText, CheckCircle, Users, CheckSquare } from "lucide-react";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";

export default function PrivacyPolicy() {
  const sections = [
    {
      title: "جمع المعلومات واستخدامها",
      icon: <Eye className="w-6 h-6 text-primary" />,
      content: "نحن نقوم بجمع المعلومات التي تقدمها لنا مباشرة عند استخدامك للمنصة، مثل المعلومات الشخصية عند التسجيل (الاسم، البريد الإلكتروني، رقم الهاتف) ومعلومات العيادة. نستخدم هذه المعلومات لتقديم خدماتنا وتحسينها وتخصيص تجربتك."
    },
    {
      title: "تكامل الخدمات (Integrations)",
      icon: <Server className="w-6 h-6 text-primary" />,
      content: "تتيح منصة طبيبي التكامل مع خدمات خارجية لتعزيز تجربتك. عند تفعيل هذه الخدمات، فإنك توافق على تبادل البيانات الضروري لعملها.",
      subsections: [
        {
          title: "تكامل تقويم جوجل (Google Calendar)",
          icon: <Calendar className="w-5 h-5 text-blue-500" />,
          text: "عند تفعيل الربط مع تقويم جوجل، سيقوم النظام بالوصول إلى تقويمك لمزامنة الحجوزات. سنقوم بإضافة الحجوزات الجديدة وتحديث المواعيد الحالية في تقويمك تلقائياً لضمان عدم تعارض المواعيد وتسهيل إدارة وقتك."
        },
        {
          title: "تكامل جهات الاتصال جوجل (Google Contacts)",
          icon: <Users className="w-5 h-5 text-green-500" />,
          text: "عند تفعيل الربط مع جهات الاتصال، سيتمكن النظام من الوصول إلى قائمة جهات الاتصال الخاصة بك. نستخدم هذا الصلاحية لمساعدتك في استيراد بيانات المرضى بسهولة إلى ملفاتهم الطبية، وتحديث معلومات الاتصال الخاصة بهم لضمان التواصل الفعال."
        },
        {
          title: "تكامل مهام جوجل (Google Tasks)",
          icon: <CheckSquare className="w-5 h-5 text-yellow-500" />,
          text: "عند تفعيل الربط مع مهام جوجل، سيتمكن النظام من إنشاء وتحديث المهام المتعلقة بالمرضى والمواعيد. نستخدم هذه الخاصية لإضافة تذكيرات تلقائية للمتابعات والمهام الإدارية لضمان سير العمل في العيادة بكفاءة."
        }
      ]
    },
    {
      title: "أمان البيانات",
      icon: <Lock className="w-6 h-6 text-primary" />,
      content: "نحن نأخذ أمان بياناتك وبيانات مرضاك على محمل الجد. نستخدم تقنيات تشفير متقدمة وبروتوكولات أمان قياسية لحماية المعلومات من الوصول غير المصرح به أو التغيير أو الإفشاء."
    },
    {
      title: "حقوق المستخدم",
      icon: <Shield className="w-6 h-6 text-primary" />,
      content: "لديك الحق في الوصول إلى بياناتك الشخصية وتصحيحها أو حذفها في أي وقت. يمكنك إدارة إعدادات حسابك أو التواصل معنا للمساعدة في ممارسة حقوقك."
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
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">سياسة الخصوصية</h1>
            <p className="text-gray-600 text-lg">
              نحن نلتزم بحماية خصوصيتك وبياناتك. توضح هذه السياسة كيفية تعاملنا مع معلوماتك.
            </p>
          </motion.div>

          <div className="space-y-8">
            {sections.map((section, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-card border border-border rounded-xl p-6 md:p-8 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg shrink-0">
                    {section.icon}
                  </div>
                  <div className="space-y-4 flex-1">
                    <h2 className="text-xl font-bold text-gray-900">{section.title}</h2>
                    <p className="text-gray-600 leading-relaxed">{section.content}</p>
                    
                    {section.subsections && (
                      <div className="mt-6 space-y-4">
                        {section.subsections.map((sub, idx) => (
                          <div key={idx} className="bg-muted/50 p-4 rounded-lg border border-border/50">
                            <div className="flex items-center gap-2 mb-2">
                              {sub.icon}
                              <h3 className="font-semibold text-gray-900">{sub.title}</h3>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">{sub.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 text-center text-sm text-gray-500"
          >
            <p>آخر تحديث: {new Date().toLocaleDateString('ar-EG')}</p>
            <p className="mt-2">إذا كان لديك أي أسئلة حول سياسة الخصوصية، يرجى التواصل معنا.</p>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
