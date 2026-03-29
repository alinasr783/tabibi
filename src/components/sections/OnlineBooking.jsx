import { Calendar, Smartphone, Share2, QrCode, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export default function OnlineBooking() {
  const features = [
    {
      icon: <Calendar className="w-6 h-6" />,
      title: "جدولة ذكية",
      description: "المريض يحجز الموعد المناسب له بنفسه من غير تدخل"
    },
    {
      icon: <Smartphone className="w-6 h-6" />,
      title: "تجربة جوال",
      description: "تصميم متجاوب يشتغل على أي جهاز موبايل أو تابلت"
    },
    {
      icon: <Share2 className="w-6 h-6" />,
      title: "مشاركة سهلة",
      description: "شارك رابط الحجز مع مرضاك أو ضعه في بوسترات العيادة"
    },
    {
      icon: <QrCode className="w-6 h-6" />,
      title: "رمز QR",
      description: "اطبع رمز QR في العيادة عشان المرضى يحجزوا بسرعة"
    }
  ];

  const steps = [
    {
      number: "1",
      title: "تفعيل الحجز الإلكتروني",
      description: "حدّد أوقات العمل المتاحة للحجز"
    },
    {
      number: "2",
      title: "مشاركة الرابط",
      description: "ابعت الرابط لمرضاك أو اعرضه في العيادة"
    },
    {
      number: "3",
      title: "المرضى يحجزوا",
      description: "المرضى يختاروا الوقت المناسب ويحجزوا مباشرة"
    },
    {
      number: "4",
      title: "تلقي الإشعارات",
      description: "تلقي إشعار فور الحجز الجديد في النظام"
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
    <section className="py-16 bg-gray-50">
      <div className="container px-4 mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={container}
        >
          {/* Section Header */}
          <motion.div variants={item} className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              حجز إلكتروني للمرضى
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              وفر على مرضاك عناء الاتصال وسهل عليهم الحجز
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* Features Grid */}
            <motion.div variants={item}>
              <div className="grid grid-cols-2 gap-4">
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={item}
                    whileHover={{ 
                      y: -4,
                      transition: { duration: 0.2 }
                    }}
                  >
                    <Card className="h-full border border-gray-200 hover:border-primary/30 hover:shadow-md transition-all bg-white">
                      <CardHeader className="pb-2">
                        <div className="mb-3 p-2 w-fit rounded-lg bg-primary/10 text-primary">
                          {feature.icon}
                        </div>
                        <CardTitle className="text-lg font-semibold text-gray-900">
                          {feature.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600">
                          {feature.description}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Steps */}
            <motion.div variants={item}>
              <Card className="border border-gray-200 bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    كيف بيشتغل؟
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {steps.map((step, index) => (
                    <motion.div 
                      key={index}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true }}
                      variants={item}
                      custom={index}
                      className="flex items-start gap-4"
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-semibold">{step.number}</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{step.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}