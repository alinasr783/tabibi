import { CalendarDays, FileText, Receipt, ShieldCheck, Stethoscope, Smartphone } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export default function CoreFeatures() {
  const features = [
    {
      icon: <CalendarDays className="w-8 h-8" />,
      title: "جدولة مواعيد ذكية",
      description: "لوحة مواعيد تفاعلية لإدارة الحجز والاستقبال بسرعة ودقة"
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: "ملف طبي إلكتروني",
      description: "حفظ التاريخ المرضي والمرفقات والملاحظات لكل مريض بشكل منظم"
    },
    {
      icon: <Receipt className="w-8 h-8" />,
      title: "فواتير وإيرادات",
      description: "إدارة الفواتير وتتبع الإيرادات مع تقارير مالية واضحة"
    },
    {
      icon: <ShieldCheck className="w-8 h-8" />,
      title: "أمان وخصوصية",
      description: "تشفير وحماية بيانات المرضى وفق أعلى المعايير"
    },
    {
      icon: <Stethoscope className="w-8 h-8" />,
      title: "روشتة PDF عبر واتساب",
      description: "توليد روشتة تلقائياً وطباعتها مع امكانية ارسالها للمريض عبر واتساب"
    },
    {
      icon: <Smartphone className="w-8 h-8" />,
      title: "واجهة تدعم الجوال",
      description: "تصميم متجاوب يعمل بسلاسة على الهواتف"
    }
  ];

  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { 
      opacity: 0, 
      y: 20
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4
      }
    }
  };

  return (
    <section className="py-16 bg-white">
      <div className="container px-4 mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={container}
        >
          {/* Section Header - Simple and Clean */}
          <motion.div variants={item} className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              الميزات الأساسية
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              أدوات مرنة تغطي دورة حياة الزيارة بالكامل في عيادتك
            </p>
          </motion.div>
          
          {/* Features Grid - Clean and Simple */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={item}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={index}
                whileHover={{ 
                  y: -4,
                  transition: { duration: 0.2 }
                }}
              >
                <Card className="h-full border border-gray-200 hover:border-primary/30 hover:shadow-md transition-all bg-white">
                  <CardHeader className="pb-2">
                    <div className="mb-4 p-3 w-fit rounded-lg bg-primary/10 text-primary">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-xl font-semibold text-gray-900">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}