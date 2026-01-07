import { ChevronDown, HelpCircle } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "../ui/card";

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleAccordion = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const faqs = [
  {
    question: "هل أقدر أستخدم Tabibi من الموبايل أو التابلت؟",
    answer: "أيوه، المنصة معمولة بتصميم متجاوب 100%، وتقدر تستخدمها بسهولة من الموبايل أو التابلت أو الكمبيوتر من أي مكان."
  },
  {
    question: "هل محتاج أنزل برنامج ولا استخدامه أونلاين؟",
    answer: "لا، Tabibi بيشتغل أونلاين مباشرة من المتصفح بدون تحميل أي برامج."
  },
  {
    question: "هل النظام بيشتغل لو النت فصل؟",
    answer: "نعم، المنصة بتدعم وضع Offline Mode، تقدر تكمل شغلك عادي، وأول ما النت يرجع البيانات بتتزامن تلقائيًا."
  },
  {
    question: "هل بيانات المرضى آمنة ومحمية؟",
    answer: "أكيد. بنستخدم تشفير قوي ومعايير أمان عالية لحماية بيانات المرضى، وكل البيانات محفوظة بسرية تامة."
  },
  {
    question: "هل في حد أقصى لعدد المرضى أو المواعيد؟",
    answer: "الحدود بتختلف حسب الباقة اللي مشترك فيها، وعندك باقات مناسبة من العيادات الصغيرة لحد الكبيرة، مع إمكانية الترقية في أي وقت."
  },
  {
    question: "هل أقدر أعمل حجز أونلاين للمرضى؟",
    answer: "أيوه، بيكون عندك صفحة حجز خاصة بالعيادة تقدر تبعتها للمرضى علشان يحجزوا مواعيدهم أونلاين بسهولة."
  },
  {
    question: "هل النظام بيدعم السكرتارية أو أكتر من مستخدم؟",
    answer: "نعم، تقدر تضيف سكرتارية وتحدد صلاحيات كل مستخدم حسب الباقة."
  },
  {
    question: "هل أقدر أطبع الروشتة والتقارير؟",
    answer: "أكيد، تقدر تنشئ وتطبع الروشتة والتقارير الطبية بسهولة، مع تحكم كامل في الشكل والعلامة المائية."
  },
  {
    question: "هل فيه دعم فني لو حصلت مشكلة؟",
    answer: "طبعًا، فريق الدعم الفني متاح لمساعدتك، سواء عبر واتساب أو الدعم المباشر داخل المنصة، أو عبر البريد الإلكتروني: contact@tabibi.site"
  },
  {
    question: "هل أقدر أغير أو ألغي الاشتراك في أي وقت؟",
    answer: "أيوه، تقدر تجدد أو ترقي الباقة أو توقف الاشتراك في أي وقت بدون أي التزامات طويلة."
  }
];


  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { 
      opacity: 0, 
      y: 10
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3
      }
    }
  };

  return (
    <section id="faq" className="py-16 bg-white">
      <div className="container px-4 mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={container}
        >
          <motion.div variants={item} className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-2">
              <HelpCircle className="w-8 h-8 text-primary" />
              الأسئلة الشائعة
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              كل ما محتاجه تعرفه عن النظام
            </p>
          </motion.div>

          <div className="max-w-3xl mx-auto space-y-3">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={item}
              >
                <Card className="overflow-hidden border border-gray-200">
                  <button
                    className="w-full p-5 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                    onClick={() => toggleAccordion(index)}
                  >
                    <h3 className="font-medium text-lg text-gray-900">{faq.question}</h3>
                    <motion.div
                      animate={{ rotate: openIndex === index ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    </motion.div>
                  </button>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <CardContent className="pt-0 pb-5 px-5 border-t border-gray-100">
                        <p className="text-gray-600 pt-3">{faq.answer}</p>
                      </CardContent>
                    </motion.div>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}